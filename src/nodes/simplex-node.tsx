import { NodeProps, useReactFlow } from "@xyflow/react";
import { BaseNodeComponent, BaseNode } from "./base-node";
import { ChangeEvent, useCallback, useEffect, useState } from "react";
import { prependUniformVariablesWithId } from "@/glsl-parsing/glsl-templates";

const simplexNodeCodeTemplate = `
vec3 col = vec3(simplex3d(vec3($UV, $seed) * $scale) * 0.5 + 0.5);
$OUT = vec4(col, 1.0);
`;

function SimplexNode({ id, data }: NodeProps<BaseNode>) {
  const { updateNodeData } = useReactFlow();

  const [seed, setSeed] = useState(0);
  const [scale, setScale] = useState(1);

  const onChangeSeed = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setSeed(Number.parseFloat(e.target.value));
  }, []);

  const onChangeScale = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setScale(Number.parseInt(e.target.value));
  }, []);

  useEffect(() => {
    updateNodeData(id, {
      shaderTemplate: prependUniformVariablesWithId(
        id,
        simplexNodeCodeTemplate,
        ["seed", "scale"],
      ),
      uniformNames: [
        { name: `${id}_seed`, type: "float" },
        { name: `${id}_scale`, type: "float" },
      ],
      uniformValues: [
        { value: seed },
        { value: scale }
      ],
    });
  }, [seed, scale, id, updateNodeData]);

  return (
    <BaseNodeComponent
      name="Simplex Noise"
      inputs={[]}
      outputs={[{ name: "out" }]}
      shaderTemplate={data.shaderTemplate}
      uniformNames={data.uniformNames}
      uniformValues={data.uniformValues}
    >
      <div>
        <label className="block text-left" htmlFor="seed">Seed</label>
        <input
          className="w-full nodrag"
          id="seed"
          type="number"
          step={0.001}
          onChange={onChangeSeed}
          value={seed}
        />
      </div>
      <div>
        <label className="block text-left" htmlFor="scale">Scale</label>
        <input
          className="w-full nodrag"
          id="scale"
          type="number"
          min={1}
          max={64}
          onChange={onChangeScale}
          value={scale}
        />
      </div>
      {data.shaderTemplate}
    </BaseNodeComponent>
  );
}

export default SimplexNode;
