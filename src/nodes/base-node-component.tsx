import Canvas from "@/components/canvas";
import { Handle, NodeProps, Position } from "@xyflow/react";
import { ReactNode } from "react";
import { OneConnectionHandle } from "./one-connection-handle";
import useStore from "./store";
import { useShallow } from "zustand/shallow";
import { nodeDefinitions } from "./definitions";

export type BaseNodeComponentParameters = {
  nodeProps: NodeProps,
  name: string,
  // parameters: { name: string, type: string }[],
  inputs: { name: string, handleId: string }[],
  outputs: { name: string }[],
  children?: ReactNode,
};

export function BaseNodeComponent({
  nodeProps,
  name,
  inputs,
  outputs,
  children,
}: BaseNodeComponentParameters) {
  const input_components = inputs.map((input, i) => (
    <div className="relative flex flex-row mr-auto" key={i}>
      <OneConnectionHandle
        className="w-3! h-3!"
        type="target"
        position={Position.Left}
        onConnect={(params) => console.log('handle onConnect (input)', params)}
        id={input.handleId}
      />
      <label
        htmlFor={input.handleId}
        className="text-xs px-2.5"
      >
        {input.name}
      </label>
    </div>
  ));

  const output_components = outputs.map((output, i) => (
    <div className="relative flex flex-row ml-auto" key={i}>
      <Handle
        className="w-3! h-3!"
        type="source"
        position={Position.Right}
        isConnectable={true}
        id={output.name}
      />
      <label
        htmlFor={output.name}
        className="text-xs px-2.5"
      >
        {output.name}
      </label>
    </div>
  ));

  const id = nodeProps.id;
  
  const template = useStore(state => state.templates.get(id));
  const parameters = useStore(useShallow(state => state.parameters.get(id)));
  // if (!parameters) throw new Error(`Node ${id} doesn't have parameters in store.`);
  const values = useStore(useShallow(state => state.values.get(id)));
  // if (!values) throw new Error(`Node ${id} doesn't have values in store.`);
  
  const type = useStore(state => state.types.get(id));
  if (!type) throw new Error(`Node ${id} isn't in store.`);

  const definition = nodeDefinitions.get(type);
  if (!definition) throw new Error(`Invalid type: ${type}`);
  
  const shouldRender = useStore(useShallow(state => {
    const inputEdges = state.edges.filter(edge => edge.target === id);
    return definition.inputs.every(input => {
      return inputEdges.find(edge => edge.targetHandle == input.handleId)?.target === id;
    });
  }));
  // const shouldRender = true;

  return (
    <div
      className={`
        flex flex-col text-center text-xs text-neutral-100
        w-48 border bg-neutral-800 border-neutral-700 transition-shadow rounded-lg
        shadow-md shadow-black hover:shadow-center-md hover:shadow-neutral-400 `
        + (nodeProps.selected ? "outline-2 outline-neutral-400" : undefined)
      }
    >
      <div className="p-2.5">
        <p className="text-base">{name}</p>
      </div>
      <div className="px-2.5 pt-2.5 flex flex-col gap-2">
        {children}
      </div>
      <div className="p-2.5">
        <Canvas
          shaderTemplate={shouldRender ? template : undefined}
          parameters={shouldRender ? parameters : undefined}
          values={values}
        />
      </div>
      <div className="flex flex-row pb-2.5">
        <div className="flex flex-col w-full gap-3">{input_components}</div>
        <div className="flex flex-col w-full gap-3">{output_components}</div>
      </div>
    </div>
  );
}
