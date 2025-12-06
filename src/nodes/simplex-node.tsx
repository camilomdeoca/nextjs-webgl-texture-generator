import { NodeProps, useReactFlow } from "@xyflow/react";
import BaseNodeComponent, { BaseNode } from "./base-node";
import { ChangeEvent, useCallback, useEffect, useState } from "react";

const simplexNodeCodeTemplate = `
vec3 col = 0.5 + 0.5 * cos( ($UV.xyx + vec3(0.0,2.0,4.0)) * 10.0 + $seed);
$OUT = vec4(col, 1.0);
`;

function SimplexNode({ id, data }: NodeProps<BaseNode>) {
  const { updateNodeData } = useReactFlow();

  const [seed, setSeed] = useState(0);
  const [octaves, setOctaves] = useState(1);

  const onChangeSeed = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setSeed(Number.parseFloat(e.target.value));
  }, []);
  
  const onChangeOctave = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setOctaves(Number.parseInt(e.target.value));
  }, []);

  useEffect(() => {
    updateNodeData(id, {
      shaderTemplate: simplexNodeCodeTemplate
        .replaceAll("$seed", `${id}_seed`)
        .replaceAll("$octaves", `${id}_octaves`),
      uniformsNamesAndValues: [
        { name: `${id}_seed`, value: seed },
        { name: `${id}_octaves`, value: octaves },
      ],
    });
  }, [seed, octaves, id, updateNodeData]);
  
  return (
    <BaseNodeComponent
      name="Simplex Noise"
      inputs={[]}
      outputs={[{ name: "out" }]}
      shaderTemplate={data.shaderTemplate}
      uniforms={data.uniformsNamesAndValues}
    >
      <div>
        <label className="block text-left" htmlFor="seed">Seed</label>
        <input
          className="w-full nodrag"
          id="seed"
          type="number"
          onChange={onChangeSeed}
        />
      </div>
      <div>
        <label className="block text-left" htmlFor="octaves">Octaves</label>
        <input
          className="w-full nodrag"
          id="octaves"
          type="number"
          min={1}
          max={8}
          onChange={onChangeOctave}
        />
      </div>
      {data.shaderTemplate}
    </BaseNodeComponent>
  );
}

export default SimplexNode;
