import { NodeProps, useNodeConnections, useNodesData, useReactFlow, Node } from "@xyflow/react";
import { BaseNodeComponent } from "./base-node-component";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { insertTemplateIntoInputCalls, prependUniformVariablesWithId } from "@/glsl-parsing/glsl-templates";
import { nodeDefinitions } from "./definitions";

type BaseNodeParameterDefinition = {
  name: string,
  id: string,
  uniformName: string,
  uniformType: string,
  inputType: string,
};

export type BaseNodeData = {
  type: string,
  shaderTemplate?: string,
  parameters?: {
    definitions: BaseNodeParameterDefinition[],
    values: unknown[],
  },
  ownValues: unknown[],
};

export type BaseNode = Node<BaseNodeData>;

function BaseNode({ id, data }: NodeProps<BaseNode>) {
  const { updateNodeData } = useReactFlow<BaseNode>();

  const connections = useNodeConnections({ handleType: "target" });
  const definition = nodeDefinitions.get(data.type);
  if (!definition) throw new Error("Invalid");

  const inputNodeIds = useMemo(() => connections.map(c => c.source), [connections]);
  const inputNodes = useNodesData<BaseNode>(inputNodeIds);

  // Compute parameter definitions of input nodes in a stable way
  // to prevent re creating the shaders when a value changes
  // This is really ugly
  const [prevInputDefinitions, setPrevInputDefinitions]
    = useState<BaseNodeParameterDefinition[] | undefined>(undefined);
  const inputParameterDefinitions = useMemo(() => {
    if (inputNodes.length !== definition.inputs.length) return undefined;
    if (inputNodes.some(n => n.data.parameters === undefined)) return undefined;
    const allDefs = inputNodes.map(n => n.data.parameters!.definitions).flat();

    // Return the previous inputParameterDefinitions if possible so the reference
    // is stable and it doesnt rerender.
    if (prevInputDefinitions && allDefs.every((def, i) => def === prevInputDefinitions![i])
    ) {
      return prevInputDefinitions;
    }

    return allDefs;
  }, [definition.inputs.length, inputNodes, prevInputDefinitions]);

  if (inputParameterDefinitions != prevInputDefinitions)
    setPrevInputDefinitions(inputParameterDefinitions);

  const ownParameterDefinitions = useMemo(() => {
    return definition.parameters.map(({ name, uniformName, uniformType, inputType }) => ({
      name,
      id,
      uniformName,
      uniformType,
      inputType,
    }));
  }, [definition.parameters, id]);
  
  useEffect(() => {
    updateNodeData(id, prev => ({
      parameters: inputParameterDefinitions ? {
        definitions: [
          ...ownParameterDefinitions,
          ...inputParameterDefinitions,
        ],
        values: prev.data.parameters?.values || [],
      } : undefined,
    }));
  }, [definition.parameters, id, inputParameterDefinitions, ownParameterDefinitions, updateNodeData]);

  const [prevInputShaderTemplates, setPrevInputShaderTemplates] = useState<string[] | undefined>(undefined);
  const inputShaderTemplates = useMemo(() => {
    if (inputNodes.length !== definition.inputs.length) return undefined;
    if (inputNodes.some(n => n.data.shaderTemplate === undefined)) return undefined;
    const allTemplates = inputNodes.map(n => n.data.shaderTemplate!);

    // Return the previous templates array if possible so the reference
    // is stable and it doesnt rerender.
    if (prevInputShaderTemplates && allTemplates.every((def, i) => def === prevInputShaderTemplates[i])
    ) {
      return prevInputShaderTemplates;
    }
    return inputNodes.map(n => n.data.shaderTemplate!);
  }, [definition.inputs.length, inputNodes, prevInputShaderTemplates]);
  if (inputShaderTemplates != prevInputShaderTemplates)
    setPrevInputShaderTemplates(inputShaderTemplates);

  const finalTemplate = useMemo(() => {
    console.log("RECONSTRUCTED SHADER");
    if (!inputShaderTemplates) return undefined;
    // if (inputShaderTemplates.length !== definition.inputs.length) return undefined;
    // if (!inputShaderTemplates.every(elem => elem !== undefined)) return undefined;

    const templateWithUniformsPrepended = prependUniformVariablesWithId(
      id,
      definition.template,
      definition.parameters.map(({ uniformName }) => uniformName),
    );

    return insertTemplateIntoInputCalls(
      id,
      templateWithUniformsPrepended,
      inputShaderTemplates,
    );
  }, [definition.parameters, definition.template, id, inputShaderTemplates]);
  
  useEffect(() => {
    updateNodeData(id, { shaderTemplate: finalTemplate });
  }, [id, updateNodeData, finalTemplate]);

  useEffect(() => {
    updateNodeData(id, prev => ({
      parameters: {
        definitions: prev.data.parameters?.definitions || [],
        values: [
          ...prev.data.ownValues,
          ...inputNodes.flatMap(({ data }) => data.parameters?.values || []),
        ],
      },
    }));
  }, [id, updateNodeData, inputNodes]);

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
