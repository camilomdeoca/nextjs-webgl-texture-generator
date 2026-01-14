"use client";

import { useEffect, useRef, useState } from "react";
import glslUtils from "@/shaders/utils.glsl";
import { BaseNodeParameterDefinition } from "@/nodes/store";
import { hexToRgba } from "@/utils/colors";
import useSettingsStore from "@/components/settings";

const vsSrc = `#version 300 es
precision highp float;

out vec2 uv;

void main() {
  vec2 positions[3];
  positions[0] = vec2(-1.0, -1.0);
  positions[1] = vec2( 3.0, -1.0);
  positions[2] = vec2(-1.0,  3.0);
  vec2 pos = positions[gl_VertexID];
  gl_Position = vec4(pos, 0.0, 1.0);
  uv = (pos + 1.0) * 0.5;
}
`;

const fsSrc = `#version 300 es
precision highp float;

in vec2 uv;
out vec4 outColor;

${glslUtils}

$UNIFORMS

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  $INSIDE
}

void main() {
  mainImage(outColor, uv);
}
`;

function compileShader(gl: WebGL2RenderingContext, src: string, type: GLenum) {
  const shader = gl.createShader(type);
  if (shader == null) throw new Error("Error creating shader.");
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.log(src);
    console.error(gl.getShaderInfoLog(shader));
    throw new Error("Error compiling shader.");
  }
  return shader;
}

function createProgram(gl: WebGL2RenderingContext, vsSrc: string, fsSrc: string) {
  const vs = compileShader(gl, vsSrc, gl.VERTEX_SHADER);
  const fs = compileShader(gl, fsSrc, gl.FRAGMENT_SHADER);

  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program));
    throw new Error('Error linking program.');
  }

  gl.deleteShader(vs);
  gl.deleteShader(fs);

  return program;
}

let globalOffscreenCanvas: OffscreenCanvas | null = null;

export default function NodePreviewCanvas({
  className,
  shaderTemplate,
  parameters,
  previewSize,
}: {
  className?: string,
  shaderTemplate?: string,
  parameters?: BaseNodeParameterDefinition[],
  previewSize?: number,
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [program, setProgram] = useState<WebGLProgram | null>(null);
  const [offscreenCanvas, setOffscreenCanvas] = useState<OffscreenCanvas | null>(null);
  const [src, setSrc] = useState<string | null>(null);

  const defaultPreviewSize = useSettingsStore(state => state.nodePreviewSize);
  
  if (previewSize === undefined) {
    previewSize = defaultPreviewSize;
  }

  // Reconstruct shader when connected nodes change
  useEffect(
    () => {
      if (process.env.NODE_ENV === "development") console.log("COMPILE SHADER");
      const canvas = canvasRef.current;
      if (canvas === null) throw new Error("Couldn't get canvas reference.");

      if (!globalOffscreenCanvas || globalOffscreenCanvas.width !== previewSize)
        globalOffscreenCanvas = new OffscreenCanvas(previewSize, previewSize);

      const gl = globalOffscreenCanvas.getContext('webgl2');
      if (gl === null) throw new Error("Couldn't get webgl context.");

      if (shaderTemplate === undefined || parameters === undefined) {
        return;
      }

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

      const finalFsSrc = fsSrc
        .replace(
          "$INSIDE",
          shaderTemplate
            .replaceAll("$UV", "fragCoord")
            .replaceAll("$OUT", "fragColor"),
        )
        .replace(
          "$UNIFORMS",
          uniformsSrc,
        );

      const program = createProgram(gl, vsSrc, finalFsSrc);
      setProgram(program);
      setOffscreenCanvas(globalOffscreenCanvas);
      setSrc(() => finalFsSrc);

      // return () => gl.deleteProgram(program);
    },
    // This should be enough because when the parameters change the template changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shaderTemplate, previewSize],
  );

  useEffect(() => {
    if (process.env.NODE_ENV === "development") console.log("RE-RENDER");
    const canvas = canvasRef.current;
    if (canvas === null) throw new Error("Couldn't get canvas reference.");
   
    // Clear the canvas if a node gets disconected or something
    if (program === null || shaderTemplate === undefined || parameters === undefined) {
      const ctx2d = canvas.getContext("2d");
      if (!ctx2d) throw new Error("Error getting canvas 2d context.");
      ctx2d.fillStyle = "#000000ff";
      ctx2d.fillRect(0, 0, canvas.width, canvas.height);
      return;
    }
   
    if (!offscreenCanvas) return;
    const gl = offscreenCanvas.getContext('webgl2');
    if (gl === null) throw new Error("Couldn't get webgl context.");

    gl.useProgram(program);

    parameters.forEach((param) => {
      switch (param.inputType) {
        case "number":
        case "slider":
        {
          const location = gl.getUniformLocation(program, `${param.id}_${param.uniformName}`);
          switch (param.uniformType.type) {
            case "float":
              gl.uniform1f(location, param.value);
              break;
            case "uint":
              gl.uniform1ui(location, param.value);
              break;
          }
          break;
        }
        case "color":
        {
          const location = gl.getUniformLocation(program, `${param.id}_${param.uniformName}`);
          if (!location) console.warn("Couldn't find variable location.");
          gl.uniform4f(location, ...(hexToRgba(param.value) ?? [0, 0, 0, 1]));
          break;
        }
        case "colorcontrolpointarray":
        {
          if (param.value.length > param.uniformType.length)
            throw new Error(`Too many control points. (max is ${param.uniformType.length})`);

          const locLength = gl.getUniformLocation(program, `${param.id}_${param.uniformName}_count`);
          gl.uniform1i(locLength, param.value.length);

          for (let i = 0; i < param.value.length; i++) {
            const colorUniformName = `${param.id}_${param.uniformName}[${i}].color`;
            const locColor = gl.getUniformLocation(program, colorUniformName);
            const lightnessUniformName = `${param.id}_${param.uniformName}[${i}].lightness`;
            const locLightness = gl.getUniformLocation(program, lightnessUniformName);

            if (!locColor) {
              console.warn(`Couldn't get color location on idx: ${i}. \`${colorUniformName}\`.`);
            }
            if (!locLightness) {
              console.warn(`Couldn't get lightness location on idx: ${i}. \`${lightnessUniformName}\`.`);
            }

            gl.uniform4f(locColor, ...(hexToRgba(param.value[i].color) ?? [0, 0, 0, 1]));
            gl.uniform1f(locLightness, param.value[i].lightness);
          }
          break;
        }
      }
    });

    // const vao = gl.createVertexArray();
    // gl.bindVertexArray(vao);

    gl.viewport(0, 0, previewSize, previewSize);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    const ctx2d = canvas.getContext("2d");
    if (!ctx2d) throw new Error("Error getting canvas 2d context.");
    ctx2d.drawImage(offscreenCanvas, 0, 0);
  }, [shaderTemplate, parameters, program, src, previewSize, offscreenCanvas]);

  return (
    <canvas
      className={className + " w-full aspect-square"}
      ref={canvasRef}
      width={previewSize}
      height={previewSize}
    />
  );
};
