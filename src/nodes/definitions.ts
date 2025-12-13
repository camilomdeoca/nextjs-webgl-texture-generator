import { preprocessTemplate } from "@/glsl-parsing/glsl-templates";

export type NodeDefinition = {
  template: string,
  parameters: {
    name: string,
    uniformName: string,
    uniformType: string,
    inputType: string,
  }[],
  inputs: {
    name: string,
    handleId: string,
  }[],
};

const nodeDefinitions = new Map<string, NodeDefinition>([
  ["invert", {
    template: preprocessTemplate(`
      vec4 input1;
      vec2 uv1 = $UV;
      $INPUT0(input1, uv1)
      vec3 col = vec3(1.0) - input1.xyz;
      $OUT = vec4(col * $brightness, 1.0);
    `),
    parameters: [
      { name: "Brightness", uniformName: "brightness", uniformType: "float", inputType: "range" },
    ],
    inputs: [
      { name: "Input", handleId: "in" },
    ],
  }],
  ["simplex", {
    template: preprocessTemplate(`
      vec3 col = vec3(simplex3d(vec3($UV, $seed) * $scale) * 0.5 + 0.5);
      $OUT = vec4(col, 1.0);
    `),
    parameters: [
      { name: "Seed", uniformName: "seed", uniformType: "float", inputType: "number" },
      { name: "Scale", uniformName: "scale", uniformType: "float", inputType: "range" },
    ],
    inputs: [],
  }],
]);
export { nodeDefinitions };
