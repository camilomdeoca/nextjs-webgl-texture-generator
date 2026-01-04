import { useEffect, useRef, useState } from "react";
import glslUtils from "@/shaders/utils.glsl";
import { BaseNodeParameterDefinition } from "@/nodes/store";
import { BaseNodeParameterValue } from "@/nodes/definitions";
import { profile } from "console";

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

    // TODO: instead of removing duplicates here try to have a set of input
    // nodes for each node (the indirect input nodes would also be there) and
    // the duplicates would be removed for being a set. The values would be
    // obtained from the ownValues of each node in that set (wouldnt need the
    // values array anymore)
    const uniqueParameters = new Set();
    const uniformsSrc = parameters.map(({ id, uniformName, uniformType }) => {
      const uniqueKey = `${id}|${uniformName}`;
      if (uniqueParameters.has(uniqueKey)) return;
      uniqueParameters.add(uniqueKey);
      const arrayString = uniformType.length === 1 ? "" : `[${uniformType.length}]`;
      return `uniform ${uniformType.type} ${id}_${uniformName}${arrayString};`;
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
      // TODO: Find a better way for this: we need separate arrays for
      // parameters an values to only recompile shaders when parameters change
      // but not when values do. Maybe we could merge parameters and values an
      // deriving here while comparing with useCustomComparison to get stable
      // references.
      switch (uniformType.type) {
        case "float":
          if (value.type !== 'number') {
            console.log(value);
            throw new Error(`Invalid value type (${value.type}) for uniform type (${uniformType})`);
          }
          gl.uniform1f(location, value.value);
          break;
        case "vec4":
          if (value.type === "number4") {
            gl.uniform4f(location, ...value.value);
          } else if (value.type === "number4array") {
            for (let i = 0; i < value.value.length; i++) {
              const loc = gl.getUniformLocation(program, `${id}_${uniformName}[${i}]`);
              if (loc === null) throw new Error("Out of array");
              gl.uniform4f(loc, ...value.value[i]);
            }
          } else {
            console.log(value);
            throw new Error(`Invalid value type (${value.type}) for uniform type (${uniformType})`);
          }
          break;
        case "uint":
          if (value.type !== 'number') {
            console.log(value);
            throw new Error(`Invalid value type (${value.type}) for uniform type (${uniformType})`);
          }
          gl.uniform1ui(location, value.value);
          break;
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
