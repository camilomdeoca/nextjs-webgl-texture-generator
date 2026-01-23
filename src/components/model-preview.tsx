"use client";

import { Canvas, ThreeElements } from "@react-three/fiber"
import { OrbitControls } from "@react-three/drei";
import { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { MeshStandardMaterial, TangentSpaceNormalMap, Texture, Vector4, WebGLProgramParametersWithUniforms } from "three";
import glslUtils from "@/shaders/utils.glsl";
import { hexToRgba } from '@/utils/colors';
import { useCallback, useEffect, useRef, useState } from "react";
import Button from "./ui/button/button";
import { useStore, useCustomComparison, getParametersFromNode, BaseNodeParameterDefinition } from "@/nodes/store";
import { useShallow } from "zustand/shallow";
import { allDefined } from "@/utils/lists";
import { Slider } from "./ui/slider";
import { NodePicker } from "./ui/node-picker";

function updateUniforms(
  shader: WebGLProgramParametersWithUniforms,
  parameters: BaseNodeParameterDefinition[],
) {
  parameters.forEach((param) => {
    switch (param.inputType) {
      case "number":
      case "slider":
      {
        shader.uniforms[`${param.id}_${param.uniformName}`] = { value: param.value };
        break;
      }
      case "color":
      {
        shader.uniforms[`${param.id}_${param.uniformName}`] = {
          value: new Vector4(...(hexToRgba(param.value) ?? [0, 0, 0, 1])),
        };
        break;
      }
      case "colorcontrolpointarray":
      {
        if (param.value.length > param.uniformType.length)
          throw new Error(`Too many control points. (max is ${param.uniformType.length})`);

        shader.uniforms[`${param.id}_${param.uniformName}_count`] = { value: param.value.length };

        shader.uniforms[`${param.id}_${param.uniformName}`] = {
          value: param.value.map(({ color, lightness }) => ({
            color: new Vector4(...(hexToRgba(color) ?? [0, 0, 0, 1])),
            lightness: lightness,
          })),
        };

        // Three.js needs to have values for all the array so we pad the values
        while (shader.uniforms[`${param.id}_${param.uniformName}`].value.length
               < param.uniformType.length)
        {
          shader.uniforms[`${param.id}_${param.uniformName}`].value.push({
            color: new Vector4(0, 0, 0, 1),
            lightness: 0.0,
          });
        }
        break;
      }
    }
  });
}

const dummyTexture = new Texture();

function Sphere(props: ThreeElements["mesh"] & {
  colorNodeId: string,
  normalNodeId: string,
  normalScale: number,
}) {
  const materialRef = useRef<MeshStandardMaterial>(null);

  const {
    colorTemplate,
    normalTemplate,
  } = useStore(useShallow(state => ({
    colorTemplate: state.templates.get(props.colorNodeId),
    normalTemplate: state.templates.get(props.normalNodeId),
  })));

  const parameters = useStore(useCustomComparison(
    state => {
      const parameters = [
        getParametersFromNode(state, props.colorNodeId),
        getParametersFromNode(state, props.normalNodeId),
      ];

      if (!allDefined(parameters)) return undefined;

      return parameters.flat();
    },
    (a, b) => {
      if (a === b) return true;
      if (a === undefined || b === undefined) return false;
      if (a.length !== b.length) return false;
      return a.every((_, i) => {
        return a[i].uniformName === b[i].uniformName
          && a[i].id === b[i].id
          && a[i].value == b[i].value;
      });
    },
  ));

  const modifyShader = useCallback((shader: WebGLProgramParametersWithUniforms) => {
    if (process.env.NODE_ENV === "development") console.log("COMPILE SHADER MODEL PREVIEW");
    if (colorTemplate === undefined || normalTemplate === undefined) return;
    if (parameters === undefined) return;

    const uniqueParameters = new Set();
    const uniformsSrc = parameters.map(({ id, uniformName, uniformType }) => {
      const uniqueKey = `${id}|${uniformName}`;
      if (uniqueParameters.has(uniqueKey)) return;
      uniqueParameters.add(uniqueKey);
      const arrayString = uniformType.array ? `[${uniformType.length}]` : "";
      const dynamicArrayLengthString = uniformType.array && uniformType.dynamic
        ? `\nuniform int ${id}_${uniformName}_count;`
        : "";
      return `uniform ${uniformType.type} ${id}_${uniformName}${arrayString};${dynamicArrayLengthString}`;
    }).join("\n")
    
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <common>",
      `
      ${glslUtils}

      ${uniformsSrc}

      void sampleProceduralDiffuse(out vec4 fragColor, in vec2 fragCoord) {
          ${colorTemplate
            .replaceAll("$UV", "fragCoord")
            .replaceAll("$OUT", "fragColor")}
      }
      
      void sampleProceduralNormal(out vec4 fragColor, in vec2 fragCoord) {
          ${normalTemplate
            .replaceAll("$UV", "fragCoord")
            .replaceAll("$OUT", "fragColor")}
      }

      #include <common>
      `
    );

    if (!shader.defines) throw new Error("shader's defines object is undefined.");
    shader.defines["USE_UV"] = "";
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <map_fragment>",
      `{
          vec4 sampledDiffuseColor;
          sampleProceduralDiffuse(sampledDiffuseColor, vUv);
          diffuseColor.rgb *= sampledDiffuseColor.rgb;
      }`
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <normal_fragment_maps>",
      `{
          vec4 sampledNormal;
          sampleProceduralNormal(sampledNormal, vUv);
          vec3 mapN = sampledNormal.xyz * 2.0 - 1.0;
          mapN.xy *= normalScale;
	        normal = normalize( tbn * mapN );
      }`
    );

    console.log(shader.vertexShader);
    console.log(shader.fragmentShader);

    if (!materialRef.current) throw new Error("materialRef is null.");
    materialRef.current.userData.shader = shader;
    updateUniforms(shader, parameters);

  }, [colorTemplate, normalTemplate, parameters]);

  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.needsUpdate = true;
    }
  }, [modifyShader])

  useEffect(() => {
    if (process.env.NODE_ENV === "development") console.log("UPDATE UNIFORMS MODEL PREVIEW");
    if (!parameters) return;
    if (!materialRef.current) throw new Error("materialRef is null.");
    if (!materialRef.current.userData.shader) return;
    const shader = materialRef.current.userData.shader as WebGLProgramParametersWithUniforms;
    updateUniforms(shader, parameters);
  }, [parameters]);

  // Return the view, these are regular Threejs elements expressed in JSX
  return (
    <mesh {...props}>
      <icosahedronGeometry args={[2, 6]} />
      {parameters && colorTemplate && normalTemplate && <meshStandardMaterial
        ref={materialRef}
        onBeforeCompile={modifyShader}
        normalMap={dummyTexture}
        normalMapType={TangentSpaceNormalMap}
        normalScale={props.normalScale}
        customProgramCacheKey={() => {
          //const startTime = performance.now();
          const key = JSON.stringify({ id: props.colorNodeId, colorTemplate, normalTemplate });
          //const endTime = performance.now();
          //console.log(`COMPUTE KEY took ${endTime-startTime} ms`);
          return key;
        }}
      />}
    </mesh>
  )
}

type ModelPreviewParams = {
  className?: string,
};

export function ModelPreview({
  className,
}: ModelPreviewParams) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
 
  const [colorNodeId, setColorNodeId] = useState<string | undefined>(undefined);
  const [normalNodeId, setNormalNodeId] = useState<string | undefined>(undefined);

  const [normalScale, setNormalScale] = useState(0.4);

  return <div className={className}>
    <div className="w-full h-full flex flex-col gap-2 pt-1">
      <Button
        className="mx-2 w-fit"
        onClick={() => {
          if (!controlsRef.current) return;
          controlsRef.current.reset();
        }}
      >
        Reset view
      </Button>
      <NodePicker
        className="mx-2"
        label="Color node"
        value={colorNodeId}
        onChange={setColorNodeId}
      />
      <NodePicker
        className="mx-2"
        label="Normal node"
        value={normalNodeId}
        onChange={setNormalNodeId}
      />
      <label className="mx-2 w-fit">
        Normal scale
        <Slider
          className="w-56"
          value={normalScale}
          min={0}
          max={1}
          step={0.1}
          onChange={setNormalScale}
          showValue
        />
      </label>
      <Canvas className="w-full grow">
        <ambientLight intensity={Math.PI / 4} />
        <directionalLight position={[10, 10, 10]} />
        {colorNodeId && normalNodeId && <Sphere
          position={[0, 0, 0]}
          colorNodeId={colorNodeId}
          normalNodeId={normalNodeId}
          normalScale={normalScale}
        />}
        <OrbitControls ref={controlsRef} />
      </Canvas>
    </div>
  </div>;
}
