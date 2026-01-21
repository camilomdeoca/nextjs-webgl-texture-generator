"use client";

import { buildFinalTemplate } from "@/glsl-parsing/glsl-templates";
import { nodeDefinitions } from "@/nodes/definitions";
import { Canvas, ThreeElements } from "@react-three/fiber"
import { OrbitControls } from "@react-three/drei";
import { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { ShaderChunk, Vector4 } from "three";
import glslUtils from "@/shaders/utils.glsl";
import { hexToRgba } from '@/utils/colors';
import { useRef } from "react";
import Button from "./ui/button/button";

function Sphere(props: ThreeElements["mesh"]) {
  // Return the view, these are regular Threejs elements expressed in JSX
  return (
    <mesh
      {...props}
    >
      <icosahedronGeometry args={[2, 2]} />
      <meshStandardMaterial
        onBeforeCompile={(shader) => {
          console.log("VERTEXSHADER");
          console.log(shader.vertexShader);
          console.log("FRAGMENTSHADER");
          console.log(shader.fragmentShader);
          console.log(ShaderChunk)
          
          const type = "simplex";
          const definition = nodeDefinitions.get(type);
          if (!definition) throw new Error(`Invalid node type: ${type}.`);
          const finalTemplate = buildFinalTemplate(
            "",
            definition.template,
            definition.parameters.map(p => p.uniformName),
            [],
          );

          const parameters = definition.parameters;

          const uniqueParameters = new Set();
          const uniformsSrc = parameters.map(({ uniformName, uniformType }) => {
            const id = "";
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
                ${finalTemplate
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

          parameters.forEach((param) => {
            switch (param.inputType) {
              case "number":
              case "slider":
              {
                shader.uniforms[`_${param.uniformName}`] = { value: param.value };
                break;
              }
              case "color":
              {
                shader.uniforms[`_${param.uniformName}`] = {
                  value: new Vector4(...(hexToRgba(param.value) ?? [0, 0, 0, 1])),
                };
                break;
              }
              case "colorcontrolpointarray":
              {
                if (param.value.length > param.uniformType.length)
                  throw new Error(`Too many control points. (max is ${param.uniformType.length})`);

                shader.uniforms[`_${param.uniformName}_count`] = { value: param.value.length };

                shader.uniforms[`_${param.uniformName}`] = {
                  value: param.value.map(({ color, lightness }) => ({
                    color: new Vector4(...(hexToRgba(color) ?? [0, 0, 0, 1])),
                    lightness: lightness,
                  })),
                };
                break;
              }
            }
          });
          console.log(shader.fragmentShader);
        }}
      />
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
        <Sphere position={[0, 0, 0]} />
        <OrbitControls ref={controlsRef} />
      </Canvas>
    </div>
  </div>;
}
