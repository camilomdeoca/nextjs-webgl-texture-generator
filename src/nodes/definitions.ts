import { preprocessTemplate } from "@/glsl-parsing/glsl-templates";

type SliderParameter = {
  inputType: "slider",
  uniformType: { type: "float" | "uint", array: false },
  value: number,

  settings: {
    min: number,
    max: number,
    step: number,
  },
};

type NumberParameter = {
  inputType: "number",
  uniformType: { type: "float", array: false },
  value: number,

  settings: {
    step: number,
  },
};

type ColorParameter = {
  inputType: "color",
  uniformType: { type: "vec4", array: false },
  value: string,
  settings: Record<never, never>,
};

type ColorControlPointArrayParameter = {
  inputType: "colorcontrolpointarray",
  uniformType: { type: "ColorControlPoint", array: true, dynamic: true, length: number},
  value: {
    color: string,
    lightness: number,
  }[],
  settings: Record<never, never>,
};

export type Parameter = (
  | SliderParameter
  | NumberParameter
  | ColorParameter
  | ColorControlPointArrayParameter
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
  ["colorcorrection", {
    name: "Color correction",
    template: preprocessTemplate(`
      vec4 input;
      vec2 uv = $UV;
      $INPUT0(input, uv)

      vec3 rgb = (input.rgb - 0.5) * $contrast + 0.5;
      vec3 hsv = rgb2hsv(rgb);
      hsv.y *= $saturation;
      hsv.z *= $brightness;
      rgb = hsv2rgb(hsv);
      rgb = pow(rgb, vec3(1.0 / $gamma));
      $OUT = vec4(rgb, input.a);
      $OUT = clamp($OUT, 0.0, 1.0);
    `),
    parameters: [
      {
        name: "Gamma",
        uniformName: "gamma",
        inputType: "slider",
        uniformType: { type: "float", array: false },
        settings: {
          min: 0.0,
          max: 3.0,
          step: 0.01,
        },
        value: 1.0,
      },
      {
        name: "Contrast",
        uniformName: "contrast",
        inputType: "slider",
        uniformType: { type: "float", array: false },
        settings: {
          min: 0.0,
          max: 3.0,
          step: 0.01,
        },
        value: 1.0,
      },
      {
        name: "Saturation",
        uniformName: "saturation",
        inputType: "slider",
        uniformType: { type: "float", array: false },
        settings: {
          min: 0.0,
          max: 3.0,
          step: 0.01,
        },
        value: 1.0,
      },
      {
        name: "Brightness",
        uniformName: "brightness",
        inputType: "slider",
        uniformType: { type: "float", array: false },
        settings: {
          min: 0.0,
          max: 3.0,
          step: 0.01,
        },
        value: 1.0,
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

        value += simplex3d(vec3($UV, $seed) * vec3($scale_x, $scale_y, 1.0) * pow(2.0, float(octave_idx))) * weight;
      }
      $OUT = vec4(vec3(value * 0.5 + 0.5), 1.0);
      $OUT = clamp($OUT, 0.0, 1.0);
    `),
    parameters: [
      {
        name: "Seed",
        uniformName: "seed",
        inputType: "number",
        uniformType: { type: "float", array: false },
        settings: {
          step: 0.001,
        },
        value: 0.0,
      },
      {
        name: "Scale X",
        uniformName: "scale_x",
        inputType: "slider",
        uniformType: { type: "float", array: false },
        settings: {
          min: 1,
          max: 100,
          step: 1,
        },
        value: 10.0,
      },
      {
        name: "Scale Y",
        uniformName: "scale_y",
        inputType: "slider",
        uniformType: { type: "float", array: false },
        settings: {
          min: 1,
          max: 100,
          step: 1,
        },
        value: 10.0,
      },
      {
        name: "Octave weight relation",
        uniformName: "octave_weight_relation",
        inputType: "slider",
        uniformType: { type: "float", array: false },
        settings: {
          min: 0.001,
          max: 2.0,
          step: 0.001,
        },
        value: 0.5,
      },
      {
        name: "Octaves",
        uniformName: "octaves",
        inputType: "slider",
        uniformType: { type: "uint", array: false },
        settings: {
          min: 1,
          max: 8,
          step: 1,
        },
        value: 1.0,
      },
    ],
    inputs: [],
  }],
  ["warp", {
    name: "Warp",
    template: preprocessTemplate(`
      vec4 warperSample, warperSampleX, warperSampleY;
      
      vec2 sampleUv = $UV;
      $INPUT0(warperSample, sampleUv)
      sampleUv = $UV + vec2($derivation_step, 0);
      $INPUT0(warperSampleX, sampleUv)
      sampleUv = $UV + vec2(0, $derivation_step);
      $INPUT0(warperSampleY, sampleUv)

      float dx = (rgb2hsv(warperSample.rgb).z - rgb2hsv(warperSampleX.rgb).z) / $derivation_step;
      float dy = (rgb2hsv(warperSample.rgb).z - rgb2hsv(warperSampleY.rgb).z) / $derivation_step;

      vec4 outputColor;
      vec2 uv = $UV + vec2(dx, dy) * $strength * 0.005;
      $INPUT1(outputColor, uv)

      $OUT = outputColor;
      $OUT = clamp($OUT, 0.0, 1.0);
    `),
    parameters: [
      {
        name: "Strength",
        uniformName: "strength",
        inputType: "slider",
        uniformType: { type: "float", array: false },
        settings: {
          min: 0.001,
          max: 1.0,
          step: 0.001,
        },
        value: 1.0,
      },
      {
        name: "Derivation step",
        uniformName: "derivation_step",
        inputType: "slider",
        uniformType: { type: "float", array: false },
        settings: {
          min: 0.0001,
          max: 0.05,
          step: 0,
        },
        value: 0.001,
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
      $OUT = clamp($OUT, 0.0, 1.0);
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
      $OUT = clamp($OUT, 0.0, 1.0);
    `),
    parameters: [
      {
        name: "Color",
        uniformName: "color",
        inputType: "color",
        uniformType: { type: "vec4", array: false },
        settings: {},
        value: "#ffffff",
      },
    ],
    inputs: [],
  }],
  ["colorize", {
    name: "Colorize",
    template: preprocessTemplate(`
      vec2 uv = $UV;
      vec4 inputColor;
      $INPUT0(inputColor, uv)

      float lightness = inputColor.r; // TODO: get hsl lightness instead

      int closestLower = -1;
      int closestUpper = -1;

      for (int i = 0; i < $color_count; i++) {
        if ($color[i].lightness <= lightness && (closestLower < 0 || $color[i].lightness > $color[closestLower].lightness)) closestLower = i;
        if ($color[i].lightness >= lightness && (closestUpper < 0 || $color[i].lightness < $color[closestUpper].lightness)) closestUpper = i;
      }

      if (closestLower < 0) $OUT = $color[closestUpper].color;
      else if (closestUpper < 0) $OUT = $color[closestLower].color;
      else if ($color[closestLower].lightness == $color[closestUpper].lightness) $OUT = $color[closestLower].color;
      else {
        float factor
          = (lightness - $color[closestLower].lightness)
          / ($color[closestUpper].lightness - $color[closestLower].lightness);

        $OUT = mix($color[closestLower].color, $color[closestUpper].color, factor);
      }
      $OUT = clamp($OUT, 0.0, 1.0);
    `),
    parameters: [
      {
        name: "Color",
        uniformName: "color",
        inputType: "colorcontrolpointarray",
        uniformType: { type: "ColorControlPoint", array: true, dynamic: true, length: 16 },
        settings: {},
        value: [
          { color: "#ff0000", lightness: 0.0 },
          { color: "#00ff00", lightness: 0.5 },
          { color: "#0000ff", lightness: 1.0 },
        ],
      },
    ],
    inputs: [
      { name: "In", handleId: "in" },
    ],
  }],
  ["worley", {
    name: "Worley",
    template: preprocessTemplate(`
      float value = 0.0;
      for (uint octave_idx = 0u; octave_idx < $octaves; octave_idx++)
      {
        float weight = pow($octave_weight_relation, float(octave_idx));
        if (abs($octave_weight_relation - 1.0) < 1e-6)
          weight *= 1.0 / float($octaves);
        else
          weight *= (1.0 - $octave_weight_relation) / (1.0 - pow($octave_weight_relation, float($octaves)));

        value += voronoi($UV * vec2($scale_x, $scale_y) * pow(2.0, float(octave_idx)), $seed) * weight;
      }
      $OUT = vec4(vec3(value), 1.0);
      $OUT = clamp($OUT, 0.0, 1.0);
    `),
    parameters: [
      {
        name: "Seed",
        uniformName: "seed",
        inputType: "number",
        uniformType: { type: "float", array: false },
        settings: {
          step: 0.1,
        },
        value: 0.0,
      },
      {
        name: "Scale X",
        uniformName: "scale_x",
        inputType: "slider",
        uniformType: { type: "float", array: false },
        settings: {
          min: 1,
          max: 100,
          step: 1,
        },
        value: 10.0,
      },
      {
        name: "Scale Y",
        uniformName: "scale_y",
        inputType: "slider",
        uniformType: { type: "float", array: false },
        settings: {
          min: 1,
          max: 100,
          step: 1,
        },
        value: 10.0,
      },
      {
        name: "Octave weight relation",
        uniformName: "octave_weight_relation",
        inputType: "slider",
        uniformType: { type: "float", array: false },
        settings: {
          min: 0.001,
          max: 2.0,
          step: 0.001,
        },
        value: 0.5,
      },
      {
        name: "Octaves",
        uniformName: "octaves",
        inputType: "slider",
        uniformType: { type: "uint", array: false },
        settings: {
          min: 1,
          max: 8,
          step: 1,
        },
        value: 1.0,
      },
    ],
    inputs: [],
  }],
  ["checkerboard", {
    name: "Checkerboard",
    template: preprocessTemplate(`
      ivec2 cell = ivec2($UV * vec2($x_cells, $y_cells));

      float color = (cell.x & 1) == (cell.y & 1) ? 1.0 : 0.0;
      $OUT = vec4(vec3(color), 1.0);
      $OUT = clamp($OUT, 0.0, 1.0);
    `),
    parameters: [
      {
        name: "X cells",
        uniformName: "x_cells",
        inputType: "number",
        uniformType: { type: "float", array: false },
        settings: {
          step: 1,
        },
        value: 2,
      },
      {
        name: "Y cells",
        uniformName: "y_cells",
        inputType: "number",
        uniformType: { type: "float", array: false },
        settings: {
          step: 1,
        },
        value: 2,
      },
    ],
    inputs: [],
  }],
]);
export { nodeDefinitions };
