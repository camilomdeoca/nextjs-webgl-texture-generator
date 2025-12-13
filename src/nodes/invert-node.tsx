import { NodeProps, useNodeConnections, useNodesData, useReactFlow } from "@xyflow/react";
import { BaseNodeComponent, BaseNode } from "./base-node";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
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

const invertNodeInputs = [
  { name: "Input", handleId: "in" },
];

function InvertNode({ id, data }: NodeProps<BaseNode>) {
  const { updateNodeData } = useReactFlow<BaseNode>();

  const unorderedConnections = useNodeConnections({
    handleType: "target",
    // handleId: "in",
  });

  // FIXME: This is O(n^2)
  const inputNodesIds = invertNodeInputs.reduce<string[] | null>((acc, { handleId }) => {
    if (acc === null) return null;
    const id = unorderedConnections.find(conn => conn.targetHandle == handleId)?.source;
    return id ? [...acc, id] : null;
  }, []) || [];

  const inputsData = useNodesData<BaseNode>(inputNodesIds);

  const inputsShaderTemplates = inputsData.map(({ data }) => data.shaderTemplate);

  const finalTemplate = useMemo(() => {
    if (inputsShaderTemplates.length !== invertNodeInputs.length) return undefined;
    if (!inputsShaderTemplates.every(elem => elem !== undefined)) return undefined;

    const templateWithUniformsPrepended = prependUniformVariablesWithId(
      id,
      invertNodeCodeTemplate,
      invertNodeParameters.map(({ uniformName }) => uniformName),
    );

    return insertTemplateIntoInputCalls(
      id,
      templateWithUniformsPrepended,
      inputsShaderTemplates,
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, JSON.stringify(inputsShaderTemplates)]);
  
  useEffect(() => {
    updateNodeData(id, { shaderTemplate: finalTemplate });
  }, [id, updateNodeData, finalTemplate]);
  
  const inputDefinitions = (() => {
    const definitions = inputsData.map(({ data }) => data.parameters?.definitions);
    if (!definitions.every(elem => elem !== undefined)) return [];
    return definitions.flat();
  })();
  
  useEffect(() => {
    updateNodeData(id, prev => ({
      parameters: {
        definitions: [
          ...invertNodeParameters.map(({ name, uniformName, uniformType, inputType }) => ({
            name,
            id,
            uniformName,
            uniformType,
            inputType,
          })),
          ...inputDefinitions,
        ],
        values: prev.data.parameters?.values || [],
      },
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, updateNodeData, JSON.stringify(inputDefinitions)]);

  useEffect(() => {
    updateNodeData(id, prev => ({
      parameters: {
        definitions: prev.data.parameters?.definitions || [],
        values: [
          ...prev.data.ownValues,
          ...inputsData.flatMap(({ data }) => data.parameters?.values || []),
        ],
      },
    }));
  }, [id, updateNodeData, inputsData]);

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
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
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
      {/* finalTemplate */}
    </BaseNodeComponent>
  );
}

export default InvertNode;
