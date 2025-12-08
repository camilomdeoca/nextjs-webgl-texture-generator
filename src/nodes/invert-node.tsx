import { NodeProps, useNodeConnections, useNodesData, useReactFlow } from "@xyflow/react";
import { BaseNodeComponent, BaseNode } from "./base-node";
import { useEffect, useMemo, useState } from "react";
import { insertTemplateIntoInputCalls, prependUniformVariablesWithId } from "@/glsl-parsing/glsl-templates";

const invertNodeCodeTemplate = `
vec4 input1;
vec2 uv1 = $UV;
$INPUT0(input1, uv1)
vec3 col = vec3(1.0) - input1.xyz;
$OUT = vec4(col * $brightness, 1.0);
`;

const invertNodeParameters: {
  name: string,
  uniformName: string,
  uniformType: string,
  inputType: string,
}[] = [
  {
      name: "Brightness",
      uniformName: "brightness",
      uniformType: "float",
      inputType: "range",
  },
  // {
  //     name: "Scale",
  //     uniformName: "scale",
  //     uniformType: "float",
  //     inputType: "range",
  // },
];

function InvertNode({ id, data }: NodeProps<BaseNode>) {
  const { updateNodeData } = useReactFlow<BaseNode>();

  const connection = useNodeConnections({
    handleType: "target",
    handleId: "in",
  });

  const inputData = useNodesData<BaseNode>(connection?.[0]?.source);

  const finalTemplate = useMemo(() => {
    console.log("AAAAAAAAAAAAAAAAA");
    const templateWithUniformsPrepended = prependUniformVariablesWithId(
      id,
      invertNodeCodeTemplate,
      invertNodeParameters.map(({ uniformName }) => uniformName),
    );

    const finalTemplate = inputData?.data.shaderTemplate !== undefined
      ? insertTemplateIntoInputCalls(
        id,
        templateWithUniformsPrepended,
        [inputData?.data.shaderTemplate],
      )
      : undefined;

    return finalTemplate;
  }, [id, inputData?.data.shaderTemplate]);
  
  useEffect(() => {
    updateNodeData(id, {
      // In nodes without inputs we dont need to change `shaderTemplate` ever
      // so we could set it just once and save the function call.
      shaderTemplate: finalTemplate,
    });
  }, [
    id,
    updateNodeData,
    finalTemplate,
  ]);
  
  useEffect(() => {
    updateNodeData(id, prev => ({
      // In nodes without inputs we dont need to change `shaderTemplate` ever
      // so we could set it just once and save the function call.
      parameters: {
        definitions: [
          ...invertNodeParameters.map(({ name, uniformName, uniformType, inputType }) => ({
            name,
            id,
            uniformName,
            uniformType,
            inputType,
          })),
          ...inputData?.data.parameters?.definitions || [],
        ],
        values: prev.data.parameters?.values || [],
      },
      // shaderTemplate: finalTemplate,
    }));
  }, [
    id,
    updateNodeData,
    finalTemplate,
    inputData?.data.parameters?.definitions,
  ]);

  useEffect(() => {
    updateNodeData(id, prev => ({
      // In nodes without inputs we dont need to change `shaderTemplate` ever
      // so we could set it just once and save the function call.
      parameters: {
        definitions: prev.data.parameters?.definitions || [],
        values: [...prev.data.ownValues, ...(inputData?.data.parameters?.values || [])],
      },
      // shaderTemplate: finalTemplate,
    }));
  }, [
    id,
    updateNodeData,
    finalTemplate,
    inputData?.data.parameters?.values,
  ]);

  const [ownValues, setOwnValues] = useState(data.ownValues);

  const inputs = invertNodeParameters.map(({ name, inputType }, i) => {
    return (
      <div key={name}>
        <label className="block text-left" htmlFor="seed">{name}</label>
        <input
          className="w-full nodrag"
          id="seed"
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
      name="Invert"
      inputs={[{ name: "in" }]}
      outputs={[{ name: "out" }]}
      data={data}
    >
      {inputs}
      {finalTemplate}
    </BaseNodeComponent>
  );
}

export default InvertNode;
