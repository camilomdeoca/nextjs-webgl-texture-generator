import { NodeProps, useNodeConnections, Node } from "@xyflow/react";
import { BaseNodeComponent } from "./base-node-component";
import { ChangeEvent, DependencyList, useEffect, useMemo, useRef, useState } from "react";
import { insertTemplateIntoInputCalls, prependUniformVariablesWithId } from "@/glsl-parsing/glsl-templates";
import { nodeDefinitions } from "./definitions";
import useStore, { getNodesData } from "./store";
import { shallow, useShallow } from "zustand/shallow";
import { useShallowCompareEffect } from "react-use";

export type BaseNodeParameterValue = number;

export type BaseNodeParameterDefinition = {
  name: string,
  id: string,
  uniformName: string,
  uniformType: string,
  inputType: string,
};

export type BaseNodeParameters = {
  definitions: BaseNodeParameterDefinition[],
  values: BaseNodeParameterValue[],
};

export type BaseNodeData = {
  type: string,
  shaderTemplate?: string,
  parameters?: BaseNodeParameters,
  ownValues: BaseNodeParameterValue[],
};

function useShallowMemo<T>(
  factory: () => T,
  deps: DependencyList,
): T {
  const ref = useRef<{
    value: T,
    deps: readonly unknown[],
  } | null>(null);

  // eslint-disable-next-line react-hooks/refs
  if (ref.current) {
    // eslint-disable-next-line react-hooks/refs
    const same = deps.length == ref.current.deps.length
      // eslint-disable-next-line react-hooks/refs
      && deps.every((dep, i) => shallow(dep, ref.current!.deps[i]));

    if (same) {
      // eslint-disable-next-line react-hooks/refs
      return ref.current.value;
    }
  }

  const value = factory();
  // eslint-disable-next-line react-hooks/refs
  ref.current = { value, deps };
  return value;
}

export type BaseNode = Node<BaseNodeData>;

function BaseNode({ id, data }: NodeProps<BaseNode>) {
  const updateNodeData = useStore(state => state.updateNodeData);

  const connections = useNodeConnections({ handleType: "target" });
  const definition = nodeDefinitions.get(data.type);
  if (!definition) throw new Error("Invalid");

  const inputNodeIds = useMemo(() => connections.map(c => c.source), [connections]);
  const inputNodesData = useStore(useShallow(state => getNodesData(state, inputNodeIds)));

  const inputParameterDefinitions = (() => {
    if (inputNodesData.length !== definition.inputs.length) return undefined;
    if (inputNodesData.some(data => data?.parameters === undefined)) return undefined;
    return inputNodesData.map(data => data!.parameters!.definitions).flat();
  })();

  const ownParameterDefinitions = useMemo(() => {
    return definition.parameters.map(({ name, uniformName, uniformType, inputType }) => ({
      name,
      id,
      uniformName,
      uniformType,
      inputType,
    }));
  }, [definition.parameters, id]);
  
  useShallowCompareEffect(() => {
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

  const inputShaderTemplates = (() => {
    if (inputNodesData.length !== definition.inputs.length) return undefined;
    if (inputNodesData.some(data => data?.shaderTemplate === undefined)) return undefined;
    return inputNodesData.map(data => data!.shaderTemplate!);
  })();

  const finalTemplate = useShallowMemo(() => {
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
          ...inputNodesData.flatMap(data => data?.parameters?.values || []),
        ],
      },
    }));
  }, [id, updateNodeData, inputNodesData]);

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
          value={ownValues[i]} // TODO: Do something better (might not be a number)
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
