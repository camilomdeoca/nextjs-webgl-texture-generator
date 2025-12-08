import { NodeProps, useReactFlow } from "@xyflow/react";
import { BaseNodeComponent, BaseNode } from "./base-node";
import { useEffect, useMemo, useState } from "react";
import { prependUniformVariablesWithId } from "@/glsl-parsing/glsl-templates";

const simplexNodeCodeTemplate = `
vec3 col = vec3(simplex3d(vec3($UV, $seed) * $scale) * 0.5 + 0.5);
$OUT = vec4(col, 1.0);
`;

const simplexNodeParameters = [
  {
      name: "Seed",
      uniformName: "seed",
      uniformType: "float",
      inputType: "number",
  },
  {
      name: "Scale",
      uniformName: "scale",
      uniformType: "float",
      inputType: "range",
  },
];

function SimplexNode({ id, data }: NodeProps<BaseNode>) {
  const { updateNodeData } = useReactFlow<BaseNode>();

  // const [shaderTemplate, setShaderTemplate] = useState(data.shaderTemplate);

  const finalTemplate = useMemo(() => {
    const finalTemplate = prependUniformVariablesWithId(
      id,
      simplexNodeCodeTemplate,
      simplexNodeParameters.map(({uniformName}) => uniformName),
    );
    console.log(finalTemplate);
    return finalTemplate;
  }, [id]);

  useEffect(() => {
    updateNodeData(id, prev => ({
      // In nodes without inputs we dont need to change `shaderTemplate` ever
      // so we could set it just once and save the function call.
      parameters: {
        definitions: simplexNodeParameters.map(({ name, uniformName, uniformType, inputType }) => ({
          name,
          id,
          uniformName,
          uniformType,
          inputType,
        })),
        values: prev.data.ownValues,
      },
      shaderTemplate: finalTemplate,
    }));
  }, [id, updateNodeData, finalTemplate]);

  const [ownValues, setOwnValues] = useState(data.ownValues);

  const inputs = simplexNodeParameters.map(({ name, inputType }, i) => {
    return (
      <div key={name}>
        <label className="block text-left" htmlFor={name}>{name}</label>
        <input
          className="w-full nodrag"
          id={name}
          type={inputType}
          step={0.001}
          onChange={(e) => {
            setOwnValues((prev) => {
              const newValues = [...prev];
              newValues[i] = parseFloat(e.target.value);


              return newValues;
            });
            updateNodeData(id, prev => {
              const newValues = [...prev.data.ownValues];
              newValues[i] = parseFloat(e.target.value);

              if (prev.data.parameters === undefined)
                throw new Error("`parameters` should be set by now because its set at the creation of the component.")

              return {
                // TODO: figure out what to do for nodes that have inputs
                parameters: {
                  ...prev.data.parameters,
                  values: [...newValues, ...prev.data.parameters?.values.slice(newValues.length)]
                },
                ownValues: newValues,
              };
            });
          }}
          value={ownValues[i] as number} // TODO: Do something better (might not be a number)
        />
      </div>
    );
  });

  return (
    <BaseNodeComponent
      name="Simplex Noise"
      inputs={[]}
      outputs={[{ name: "out" }]}
      data={data}
    >
      {inputs}
      {/*shaderTemplate*/}
    </BaseNodeComponent>
  );
}

export default SimplexNode;
