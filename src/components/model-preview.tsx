import { createProgram } from "@/utils/webgl2";
import { useCallback, useEffect, useRef, useState } from "react";

const vsSource = `#version 300 es
precision highp float;

layout(location = 0) in vec3 aPosition;
layout(location = 1) in vec3 aNormal;

uniform mat4 uProjection;
uniform mat4 uView;
uniform mat4 uModel;

out vec3 vNormal;

void main() {
  mat4 mvp = uProjection * uView * uModel;
  vNormal = mat3(uModel) * aNormal;
  gl_Position = mvp * vec4(aPosition, 1.0);
}
`;

const fsSource = `#version 300 es
precision highp float;

in vec3 vNormal;
out vec4 outColor;

void main() {
  vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
  float diffuse = max(dot(normalize(vNormal), lightDir), 0.0);
  vec3 color = vec3(0.2, 0.6, 1.0) * diffuse + 0.1;
  outColor = vec4(color, 1.0);
}
`;

function createSphere(radius = 1, latBands = 32, lonBands = 32) {
  const positions = [];
  const normals = [];
  const indices = [];

  for (let lat = 0; lat <= latBands; lat++) {
    const theta = (lat * Math.PI) / latBands;
    const sinT = Math.sin(theta);
    const cosT = Math.cos(theta);

    for (let lon = 0; lon <= lonBands; lon++) {
      const phi = (lon * 2 * Math.PI) / lonBands;
      const sinP = Math.sin(phi);
      const cosP = Math.cos(phi);

      const x = cosP * sinT;
      const y = cosT;
      const z = sinP * sinT;

      normals.push(x, y, z);
      positions.push(radius * x, radius * y, radius * z);
    }
  }

  for (let lat = 0; lat < latBands; lat++) {
    for (let lon = 0; lon < lonBands; lon++) {
      const first = lat * (lonBands + 1) + lon;
      const second = first + lonBands + 1;

      indices.push(first, second, first + 1);
      indices.push(second, second + 1, first + 1);
    }
  }

  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    indices: new Uint16Array(indices),
  };
}

const sphereModel = createSphere();

function createSphereVAO(gl: WebGL2RenderingContext) {
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);

  const posBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, sphereModel.positions, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
  
  const normBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, normBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, sphereModel.normals, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
  
  const indexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, sphereModel.indices, gl.STATIC_DRAW);
  
  return vao;
}

function perspective(fovy: number, aspect: number, near: number, far: number) {
  const f = 1 / Math.tan(fovy / 2);
  return new Float32Array([
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (far + near) / (near - far), -1,
    0, 0, (2 * far * near) / (near - far), 0,
  ]);
}

function identity() {
  return new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ]);
}

type ModelPreviewParams = {
  className?: string,
};

export function ModelPreview({
  className,
}: ModelPreviewParams) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [renderCtx, setRenderCtx] = useState<{
    program: WebGLProgram,
    vao: WebGLVertexArrayObject,
  } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) throw new Error("Error trying to resize before getting canvas reference.");
    const gl = canvas.getContext("webgl2");
    if (!gl) throw new Error("Error getting WebGL2 context.");

    const program = createProgram(gl, vsSource, fsSource);
    const vao = createSphereVAO(gl);
    setRenderCtx({ program, vao });
  }, [canvasRef]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) throw new Error("Error trying to resize before getting canvas reference.");
    const gl = canvas.getContext("webgl2");
    if (!gl) throw new Error("Error getting WebGL2 context.");
    if (!renderCtx) return;//throw new Error("Render context is null.");

    gl.enable(gl.DEPTH_TEST);
    gl.useProgram(renderCtx.program);
    
    const uProjection = gl.getUniformLocation(renderCtx.program, "uProjection");
    const uView = gl.getUniformLocation(renderCtx.program, "uView");
    const uModel = gl.getUniformLocation(renderCtx.program, "uModel");

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.05, 0.05, 0.1, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const projection = perspective(
      Math.PI / 4,
      canvas.width / canvas.height,
      0.1,
      100
    );
    
    const view = identity();
    
    const model = identity();
    model[14] = -4; // translate Z
    
    gl.uniformMatrix4fv(uProjection, false, projection);
    gl.uniformMatrix4fv(uView, false, view);
    gl.uniformMatrix4fv(uModel, false, model);

    gl.bindVertexArray(renderCtx.vao);
    gl.drawElements(gl.TRIANGLES, sphereModel.indices.length, gl.UNSIGNED_SHORT, 0);

    console.log("Drawn:", canvas.width, canvas.height);
  }, [renderCtx]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) throw new Error("Error trying to resize before getting canvas reference.");
    
    const resize = () => {
      const { width, height } = canvas.getBoundingClientRect();

      const dpr = window.devicePixelRatio || 1;

      canvas.width = width * dpr;
      canvas.height = height * dpr;

      draw();
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    resize();

    return () => observer.disconnect();
  }, [draw]);

  return <div className={className}>
    <canvas onClick={draw} ref={canvasRef} className="w-full h-full" />
  </div>;
}
