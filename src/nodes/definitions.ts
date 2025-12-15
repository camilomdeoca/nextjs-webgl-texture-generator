import { preprocessTemplate } from "@/glsl-parsing/glsl-templates";

export type NodeDefinition = {
  name: string,
  template: string,
  parameters: {
    name: string,
    uniformName: string,
    uniformType: string,
    inputType: string,
    defaultValue: unknown,
  }[],
  inputs: {
    name: string,
    handleId: string,
  }[],
};

const nodeDefinitions = new Map<string, NodeDefinition>([
  ["invert", {
    name: "Invert",
    template: preprocessTemplate(`
      vec4 input1;
      vec2 uv1 = $UV;
      $INPUT0(input1, uv1)
      vec3 col = vec3(1.0) - input1.xyz;
      $OUT = vec4(col * $brightness, 1.0);
    `),
    parameters: [
      { name: "Brightness", uniformName: "brightness", uniformType: "float", inputType: "range", defaultValue: 1 },
    ],
    inputs: [
      { name: "Input", handleId: "in" },
    ],
  }],
  ["simplex", {
    name: "Simplex",
    template: preprocessTemplate(`
      vec3 col = vec3(simplex3d(vec3($UV, $seed) * $scale) * 0.5 + 0.5);
      $OUT = vec4(col, 1.0);
    `),
    parameters: [
      { name: "Seed", uniformName: "seed", uniformType: "float", inputType: "number", defaultValue: 0 },
      { name: "Scale", uniformName: "scale", uniformType: "float", inputType: "range", defaultValue: 10 },
    ],
    inputs: [],
  }],
]);
export { nodeDefinitions };
