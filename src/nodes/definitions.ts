import { preprocessTemplate } from "@/glsl-parsing/glsl-templates";
import { BaseNodeParameterValue } from "./store";

type SliderParameter = {
  inputType: "slider",
  uniformType: "float" | "uint",
  min: number,
  max: number,
  step: number,
  defaultValue: number,
};

type NumberParameter = {
  inputType: "number",
  uniformType: "float",
  step: number,
  defaultValue: number,
};

type Parameter = (SliderParameter | NumberParameter) & {
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
        uniformType: "float",
        min: 0,
        max: 10,
        step: 0.01,
        defaultValue: 1,
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
        uniformType: "float",
        step: 0.001,
        defaultValue: 0,
      },
      {
        name: "Scale",
        uniformName: "scale",
        inputType: "slider",
        uniformType: "float",
        min: 0.001,
        max: 100,
        step: 0.01,
        defaultValue: 10,
      },
      {
        name: "Octave weight relation",
        uniformName: "octave_weight_relation",
        inputType: "slider",
        uniformType: "float",
        min: 0.001,
        max: 2.0,
        step: 0.001,
        defaultValue: 0.5,
      },
      {
        name: "Octaves",
        uniformName: "octaves",
        inputType: "slider",
        uniformType: "uint",
        min: 1,
        max: 8,
        step: 1,
        defaultValue: 1,
      },
    ],
    inputs: [],
  }],
]);
export { nodeDefinitions };
