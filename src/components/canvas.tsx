import { useEffect, useRef } from "react";
import glslUtils from "@/shaders/utils.glsl";

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

const previewSize = 128;

function Canvas({
  shaderTemplate,
  uniforms,
}: {
  shaderTemplate?: string,
  uniforms?: {
    name: string,
    value: unknown,
  }[],
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    (async () => {
      const canvas = canvasRef.current as HTMLCanvasElement;
      const gl = canvas.getContext('webgl2');
      if (gl === null) throw new Error("Couldn't get webgl context.");

      // Clear the canvas if a node gets disconected or something
      if (shaderTemplate === undefined || uniforms === undefined) {
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        return;
      }

      // const canvas = new OffscreenCanvas(previewSize, previewSize);

      // TODO: Use real uniforms
      const uniformsSrc = uniforms.map(({ name, value }) => {
        return `const float ${name} = ${value.toFixed(10)};`; // TODO: remove hardcoded float type
      }).join("\n");

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
      gl.useProgram(program);

      const vao = gl.createVertexArray();
      gl.bindVertexArray(vao);

      gl.viewport(0, 0, previewSize, previewSize);

      gl.drawArrays(gl.TRIANGLES, 0, 3);

      // canvas.convertToBlob().then((blob) => {
      //   console.log(blob);
      //   const image = canvasRef.current;
      //   if (image === null) throw new Error("Error getting reference to img element.");
      //   image.src = URL.createObjectURL(blob);
      // });
    })();
  }, [shaderTemplate, uniforms]);

  return (
    <canvas
      className="w-full aspect-square"
      ref={canvasRef}
      width={previewSize}
      height={previewSize}
    />
  );
};

export default Canvas;
