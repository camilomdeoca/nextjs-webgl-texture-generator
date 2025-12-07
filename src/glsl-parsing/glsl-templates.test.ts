import { expect, test } from 'vitest'
import { insertTemplateIntoInputCalls, prependUniformVariablesWithId } from './glsl-templates';

const simplexNodeCodeTemplate = `
vec3 col = vec3(simplex3d(vec3($UV, $seed) * $scale) * 0.5 + 0.5);
$OUT = vec4(col, 1.0);
`;


test("Insert a template from an input node in another", () => {
  const invertNodeCodeTemplate = `
vec4 input1;
vec2 uv1 = $UV;
$INPUT0(input1, uv1)
vec3 col = vec3(1.0) - input1.xyz;
$OUT = vec4(col, 1.0);
`;

  expect(insertTemplateIntoInputCalls("n1", invertNodeCodeTemplate, [simplexNodeCodeTemplate]))
    .toBe(`
vec4 n1_input1;
vec2 n1_uv1 = $UV;
{
  vec3 col = vec3(simplex3d(vec3(n1_uv1, $seed) * $scale) * 0.5 + 0.5);
  n1_input1 = vec4(col, 1.0);
}
vec3 col = vec3(1.0) - n1_input1.xyz;
$OUT = vec4(col, 1.0);
`);
});

test("Insert a template from an input node in another two times", () => {
  const invertNodeCodeTemplate = `
vec4 input1;
vec2 uv1 = $UV;
$INPUT0(input1, uv1)
vec3 col = vec3(1.0) - input1.xyz;
$OUT = vec4(col, 1.0);
`;

  let result = insertTemplateIntoInputCalls("n1", invertNodeCodeTemplate, [simplexNodeCodeTemplate]);
  result = insertTemplateIntoInputCalls("n2", invertNodeCodeTemplate, [result]);
  expect(result).toBe(`
vec4 n2_input1;
vec2 n2_uv1 = $UV;
{
  vec4 n1_input1;
  vec2 n1_uv1 = n2_uv1;
  {
    vec3 col = vec3(simplex3d(vec3(n1_uv1, $seed) * $scale) * 0.5 + 0.5);
    n1_input1 = vec4(col, 1.0);
  }
  vec3 col = vec3(1.0) - n1_input1.xyz;
  n2_input1 = vec4(col, 1.0);
}
vec3 col = vec3(1.0) - n2_input1.xyz;
$OUT = vec4(col, 1.0);
`);
});


test("Input node that is called multiple times", () => {
  const invertNodeCodeTemplate = `
vec4 input1;
vec2 uv1 = $UV;
$INPUT0(input1, uv1)
vec4 input2;
vec2 uv2 = $UV;
$INPUT0(input2, uv2)
vec3 col = vec3(1.0) - input1.xyz;
$OUT = vec4(col, 1.0);
`;

  expect(insertTemplateIntoInputCalls("n1", invertNodeCodeTemplate, [simplexNodeCodeTemplate]))
    .toBe(`
vec4 n1_input1;
vec2 n1_uv1 = $UV;
{
  vec3 col = vec3(simplex3d(vec3(n1_uv1, $seed) * $scale) * 0.5 + 0.5);
  n1_input1 = vec4(col, 1.0);
}
vec4 n1_input2;
vec2 n1_uv2 = $UV;
{
  vec3 col = vec3(simplex3d(vec3(n1_uv2, $seed) * $scale) * 0.5 + 0.5);
  n1_input2 = vec4(col, 1.0);
}
vec3 col = vec3(1.0) - n1_input1.xyz;
$OUT = vec4(col, 1.0);
`);
});


// TODO: fix `insertTemplateIntoInputCalls` to make this pass
// test("Input node that is called multiple times with variables contained in another symbol", () => {
//   const invertNodeCodeTemplate= `
// vec4 input1;
// vec2 uv = $UV;
// $INPUT0(input1, uv)
// vec4 input2;
// vec2 uv2 = $UV;
// $INPUT0(input2, uv2)
// vec3 col = vec3(1.0) - input1.xyz;
// $OUT = vec4(col, 1.0);
// `;
//
//   expect(insertTemplateIntoInputCalls("n1", invertNodeCodeTemplate, [simplexNodeCodeTemplate])).toEqual(`
// vec4 n1_input1;
// vec2 n1_uv = $UV;
// {
//   vec3 col = vec3(simplex3d(vec3(n1_uv, $seed) * $scale) * 0.5 + 0.5);
//   n1_input1 = vec4(col, 1.0);
// }
// vec4 n1_input2;
// vec2 n1_uv2 = $UV;
// {
//   vec3 col = vec3(simplex3d(vec3(n1_uv2, $seed) * $scale) * 0.5 + 0.5);
//   n1_input2 = vec4(col, 1.0);
// }
// vec3 col = vec3(1.0) - n1_input1.xyz;
// $OUT = vec4(col, 1.0);
// `);
// });


test("prepend all uniform variables with id in a template", () => {
  const template = `
vec3 col = vec3(simplex3d(vec3($UV, $seed) * $scale) * 0.5 + 0.5);
$OUT = vec4(col, 1.0);
`;

  expect(prependUniformVariablesWithId("n1", template, ["seed", "scale"])).toBe(`
vec3 col = vec3(simplex3d(vec3($UV, n1_seed) * n1_scale) * 0.5 + 0.5);
$OUT = vec4(col, 1.0);
`);
});
