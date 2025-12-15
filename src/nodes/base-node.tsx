import { NodeProps, useNodeConnections, useNodesData, useReactFlow, Node } from "@xyflow/react";
import { BaseNodeComponent } from "./base-node-component";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { insertTemplateIntoInputCalls, prependUniformVariablesWithId } from "@/glsl-parsing/glsl-templates";
import { nodeDefinitions } from "./definitions";

export type BaseNodeData = {
  type: string,
  shaderTemplate?: string,
  parameters?: {
    definitions: {
      name: string,
      id: string,
      uniformName: string,
      uniformType: string,
      inputType: string,
    }[],
    values: unknown[],
  },
  ownValues: unknown[],
};

export type BaseNode = Node<BaseNodeData>;

function BaseNode({ id, data }: NodeProps<BaseNode>) {
  const { updateNodeData } = useReactFlow<BaseNode>();

  const unorderedConnections = useNodeConnections({
    handleType: "target",
    // handleId: "in",
  });

  const type = data.type;
  const definition = nodeDefinitions.get(type);

  if (!definition) {
    throw new Error("Invalid")
  }

  // FIXME: This is O(n^2)
  const inputNodesIds = definition.inputs.reduce<string[] | null>((acc, { handleId }) => {
    if (acc === null) return null;
    const id = unorderedConnections.find(conn => conn.targetHandle == handleId)?.source;
    return id ? [...acc, id] : null;
  }, []) || [];

  const inputsData = useNodesData<BaseNode>(inputNodesIds);
  
  const inputDefinitions = (() => {
    const definitions = inputsData.map(({ data }) => data.parameters?.definitions);
    if (!definitions.every(elem => elem !== undefined)) return undefined;
    return definitions.flat();
  })();
  
  useEffect(() => {
    updateNodeData(id, prev => ({
      parameters: inputDefinitions ? {
        definitions: [
          ...definition.parameters.map(({ name, uniformName, uniformType, inputType }) => ({
            name,
            id,
            uniformName,
            uniformType,
            inputType,
          })),
          ...inputDefinitions,
        ],
        values: prev.data.parameters?.values || [],
      } : undefined,
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [definition.parameters, id, JSON.stringify(inputDefinitions), updateNodeData]);

  const inputsShaderTemplates = inputsData.map(({ data }) => data.shaderTemplate);

  const finalTemplate = useMemo(() => {
    if (inputsShaderTemplates.length !== definition.inputs.length) return undefined;
    if (!inputsShaderTemplates.every(elem => elem !== undefined)) return undefined;

    const templateWithUniformsPrepended = prependUniformVariablesWithId(
      id,
      definition.template,
      definition.parameters.map(({ uniformName }) => uniformName),
    );

    return insertTemplateIntoInputCalls(
      id,
      templateWithUniformsPrepended,
      inputsShaderTemplates,
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    definition.inputs.length,
    definition.parameters,
    definition.template,
    id,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    JSON.stringify(inputsShaderTemplates),
  ]);
  
  useEffect(() => {
    updateNodeData(id, { shaderTemplate: finalTemplate });
  }, [id, updateNodeData, finalTemplate]);

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

  const inputs = definition.parameters.map(({ name, inputType }, i) => {
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
      name={definition.name}
      inputs={definition.inputs}
      outputs={[{ name: "out" }]}
      data={data}
    >
      {inputs}
    </BaseNodeComponent>
  );
}

export default BaseNode;
