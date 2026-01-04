import { preprocessTemplate } from "@/glsl-parsing/glsl-templates";

export type BaseNodeParameterValue = NumberValue | Number4Value | Number4ArrayValue;

type NumberValue = {
  type: "number",
  value: number,
};

type Number4Value = {
  type: "number4",
  value: [number, number, number, number],
};

type Number4ArrayValue = {
  type: "number4array",
  value: [number, number, number, number][],
};

type SliderParameter = {
  inputType: "slider",
  uniformType: { type: "float" | "uint", length: 1 },
  min: number,
  max: number,
  step: number,
};

type NumberParameter = {
  inputType: "number",
  uniformType: { type: "float", length: 1 },
  step: number,
};

type ColorParameter = {
  inputType: "color",
  uniformType: { type: "vec4", length: 1 },
};

type ColorArrayParameter = {
  inputType: "colorarray",
  uniformType: { type: "vec4", length: number},
};

export type Parameter = (
  | SliderParameter & { defaultValue: NumberValue }
  | NumberParameter & { defaultValue: NumberValue }
  | ColorParameter & { defaultValue: Number4Value }
  | ColorArrayParameter & { defaultValue: Number4ArrayValue }
) & {
  name: string,
  uniformName: string,
};

export type NodeDefinition = {
  name: string,
  template: string,
  parameters: Parameter[],
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
      {
        name: "Brightness",
        uniformName: "brightness",
        inputType: "slider",
        uniformType: { type: "float", length: 1 },
        min: 0,
        max: 10,
        step: 0.01,
        defaultValue: { type: "number", value: 1.0 },
      },
    ],
    inputs: [
      { name: "Input", handleId: "in" },
    ],
  }],
  ["simplex", {
    name: "Simplex",
    template: preprocessTemplate(`
      float value = 0.0;
      for (uint octave_idx = 0u; octave_idx < $octaves; octave_idx++)
      {
        float weight = pow($octave_weight_relation, float(octave_idx));
        if (abs($octave_weight_relation - 1.0) < 1e-6)
          weight *= 1.0 / float($octaves);
        else
          weight *= (1.0 - $octave_weight_relation) / (1.0 - pow($octave_weight_relation, float($octaves)));

        value += simplex3d(vec3($UV, $seed) * $scale * pow(2.0, float(octave_idx))) * weight;
      }
      $OUT = vec4(vec3(value * 0.5 + 0.5), 1.0);
    `),
    parameters: [
      {
        name: "Seed",
        uniformName: "seed",
        inputType: "number",
        uniformType: { type: "float", length: 1 },
        step: 0.001,
        defaultValue: { type: "number", value: 0.0 },
      },
      {
        name: "Scale",
        uniformName: "scale",
        inputType: "slider",
        uniformType: { type: "float", length: 1 },
        min: 0.001,
        max: 100,
        step: 0.01,
        defaultValue: { type: "number", value: 10.0 },
      },
      {
        name: "Octave weight relation",
        uniformName: "octave_weight_relation",
        inputType: "slider",
        uniformType: { type: "float", length: 1 },
        min: 0.001,
        max: 2.0,
        step: 0.001,
        defaultValue: { type: "number", value: 0.5 },
      },
      {
        name: "Octaves",
        uniformName: "octaves",
        inputType: "slider",
        uniformType: { type: "uint", length: 1 },
        min: 1,
        max: 8,
        step: 1,
        defaultValue: { type: "number", value: 1.0 },
      },
    ],
    inputs: [],
  }],
  ["warp", {
    name: "Warp",
    template: preprocessTemplate(`
      vec4 warperValue;
      vec2 uv = $UV;
      $INPUT0(warperValue, uv)
      vec2 d = vec2(dFdx(warperValue.r), dFdy(warperValue.r));

      vec4 outputColor;
      uv += d * $strength;
      $INPUT1(outputColor, uv)

      $OUT = outputColor;
    `),
    parameters: [
      {
        name: "Strength",
        uniformName: "strength",
        inputType: "slider",
        uniformType: { type: "float", length: 1 },
        min: 0.001,
        max: 1.0,
        step: 0.001,
        defaultValue: { type: "number", value: 1.0 },
      },
    ],
    inputs: [
      { name: "Warper", handleId: "warper" },
      { name: "Warped", handleId: "warped" },
    ],
  }],
  ["mix", {
    name: "Mix",
    template: preprocessTemplate(`
      vec2 uv = $UV;
      vec4 light;
      $INPUT0(light, uv)
      vec4 dark;
      $INPUT1(dark, uv)
      vec4 mask;
      $INPUT2(mask, uv)

      $OUT = mix(dark, light, mask.r);
    `),
    parameters: [],
    inputs: [
      { name: "Light mask", handleId: "light" },
      { name: "Dark mask", handleId: "dark" },
      { name: "Mask", handleId: "mask" },
    ],
  }],
  ["solid_color", {
    name: "Solid color",
    template: preprocessTemplate(`
      vec2 uv = $UV;
      $OUT = $color;
    `),
    parameters: [
      {
        name: "Color",
        uniformName: "color",
        inputType: "color",
        uniformType: { type: "vec4", length: 1 },
        defaultValue: { type: "number4", value: [1.0, 1.0, 1.0, 1.0] },
      },
    ],
    inputs: [],
  }],
  ["colorize", {
    name: "Colorize",
    template: preprocessTemplate(`
      vec2 uv = $UV;
      $OUT = $color[0];
    `),
    parameters: [
      {
        name: "Color",
        uniformName: "color",
        inputType: "colorarray",
        uniformType: { type: "vec4", length: 16 },
        defaultValue: { type: "number4array", value: [[0, 1, 0, 1], [1.0, 0.0, 1.0, 1.0]] },
      },
    ],
    inputs: [],
  }],
]);
export { nodeDefinitions };
