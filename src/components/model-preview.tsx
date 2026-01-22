"use client";

import { Canvas, ThreeElements } from "@react-three/fiber"
import { OrbitControls } from "@react-three/drei";
import { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { MeshStandardMaterial, Vector4, WebGLProgramParametersWithUniforms } from "three";
import glslUtils from "@/shaders/utils.glsl";
import { hexToRgba } from '@/utils/colors';
import { useCallback, useEffect, useRef } from "react";
import Button from "./ui/button/button";
import { useStore, useCustomComparison, getParametersFromNode, BaseNodeParameterDefinition } from "@/nodes/store";

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

function Sphere(props: ThreeElements["mesh"] & { nodeId: string }) {
  const materialRef = useRef<MeshStandardMaterial>(null);

  const id = props.nodeId;
  const template = useStore(state => state.templates.get(id));
  const parameters = useStore(useCustomComparison(
    state => getParametersFromNode(state, id),
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
    if (template === undefined) return;
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
          ${template
            .replaceAll("$UV", "fragCoord")
            .replaceAll("$OUT", "fragColor")}
      }\n` + "#include <common>"
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

    if (!materialRef.current) throw new Error("materialRef is null.");
    materialRef.current.userData.shader = shader;
    updateUniforms(shader, parameters);

  }, [parameters, template]);

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
      <icosahedronGeometry args={[2, 2]} />
      {parameters && template && <meshStandardMaterial
        ref={materialRef}
        onBeforeCompile={modifyShader}
        customProgramCacheKey={() => {
          const startTime = performance.now();
          const key = JSON.stringify({ id, template });
          const endTime = performance.now();
          console.log(`COMPUTE KEY took ${endTime-startTime} ms`);
          return key;
        }}
      />}
    </mesh>
  )
}

type ModelPreviewParams = {
  className?: string,
  nodeId?: string,
};

export function ModelPreview({
  className,
  nodeId,
}: ModelPreviewParams) {
  const controlsRef = useRef<OrbitControlsImpl>(null);

  return <div className={className}>
    <div className="w-full h-full flex flex-col">
      <Button
        className="mx-2 my-1"
        onClick={() => {
          if (!controlsRef.current) return;
          controlsRef.current.reset();
        }}
      >
        Reset view
      </Button>
      <Canvas className="w-full grow">
        <ambientLight intensity={Math.PI / 4} />
        <directionalLight position={[10, 10, 10]} />
        {nodeId && <Sphere position={[0, 0, 0]} nodeId={nodeId} />}
        <OrbitControls ref={controlsRef} />
      </Canvas>
    </div>
  </div>;
}
