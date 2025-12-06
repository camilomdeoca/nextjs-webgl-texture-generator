import { expect, test } from 'vitest'
import getGLSLCodeNodeParams from './extract-parameters';

test("Getting params from an example code for a node", () => {
  const code = `
  void helperFunc(int a, float b) { }
  
  void mainImage(
      out vec4 fragColor,
      in vec2 fragCoord, // daw aw
      float seed, /*AWDAWD*/
      const float octaves // holaaaa
  ) { 
      // body
  }
  
  float anotherFunc(float x) { return x; }
  `;
  expect(getGLSLCodeNodeParams(code)).toEqual([
    { name: 'seed', type: 'float' },
    { name: 'octaves', type: 'float' },
  ]);
});
