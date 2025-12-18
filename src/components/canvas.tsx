import { useEffect, useRef, useState } from "react";
import glslUtils from "@/shaders/utils.glsl";
import { BaseNodeParameterDefinition, BaseNodeParameterValue } from "@/nodes/store";

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

$UNIFORMS

${glslUtils}

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

const previewSize = 512;

function Canvas({
  className,
  shaderTemplate,
  parameters,
  values,
}: {
  className?: string,
  shaderTemplate?: string,
  parameters?: BaseNodeParameterDefinition[],
  values?: BaseNodeParameterValue[],
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [program, setProgram] = useState<WebGLProgram | null>(null);
  const [src, setSrc] = useState<string | null>(null);

  // Reconstruct shader when connected nodes change
  useEffect(() => {
    console.log("RECONSTRUCT SHADER" /*, shaderTemplate, parameters*/);
    const canvas = canvasRef.current;
    if (canvas === null) throw new Error("Couldn't get canvas reference.");
    const gl = canvas.getContext('webgl2');
    if (gl === null) throw new Error("Couldn't get webgl context.");

    if (shaderTemplate === undefined || parameters === undefined) {
      return;
    }

    const uniformsSrc = parameters.map(({ id, uniformName, uniformType }) => {
      return `uniform ${uniformType} ${id}_${uniformName};`;
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

    setProgram(() => createProgram(gl, vsSrc, finalFsSrc));
    setSrc(() => finalFsSrc);
  }, [shaderTemplate, parameters]);

  useEffect(() => {
    console.log("RE-RENDER"/*, program, shaderTemplate, parameters, values*/);
    const canvas = canvasRef.current;
    if (canvas === null) throw new Error("Couldn't get canvas reference.");
    const gl = canvas.getContext('webgl2');
    if (gl === null) throw new Error("Couldn't get webgl context.");

    // Clear the canvas if a node gets disconected or something
    if (program === null || shaderTemplate === undefined || parameters === undefined || values === undefined) {
      gl.clearColor(0.0, 0.0, 0.0, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      return;
    }

    gl.useProgram(program);

    parameters.forEach(({ id, uniformName, uniformType }, i) => {
      const location = gl.getUniformLocation(program, `${id}_${uniformName}`);
      if (location === null) {
        // If we are here its because the parameters useEffect updated first
        // and then before the finalTemplate updated the canvas updated
        return;
      }

      const value = values[i];
      switch (uniformType) {
        case "float":
          if (typeof value !== 'number') {
            console.log(value);
            throw new Error(`Invalid value type (${typeof value}) for uniform type (${uniformType})`);
          }
          gl.uniform1f(location, value);
          break;
        default:
          throw new Error(`Unform type: \`${uniformType}\` invalid or not implemented.`)
      }
    });

    // const vao = gl.createVertexArray();
    // gl.bindVertexArray(vao);

    gl.viewport(0, 0, previewSize, previewSize);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }, [shaderTemplate, parameters, program, src, values]);

  return (
    <canvas
      className={className + " w-full aspect-square"}
      ref={canvasRef}
      width={previewSize}
      height={previewSize}
    />
  );
};

export default Canvas;
