import Canvas from "@/components/canvas";
import { Handle, Node, Position } from "@xyflow/react";
import { ReactNode } from "react";

export type BaseNodeData = {
  shaderTemplate?: string,
  uniformsNamesAndValues?: { name: string, value: unknown }[],
};

export type BaseNode = Node<BaseNodeData>;

export type BaseNodeComponentParameters = {
  name: string,
  // parameters: { name: string, type: string }[],
  inputs: { name: string }[],
  outputs: { name: string }[],
  children?: ReactNode,
  shaderTemplate?: string,
  uniforms?: { name: string, value: unknown }[],
};

function BaseNodeComponent({ name, inputs, outputs, children, shaderTemplate, uniforms }: BaseNodeComponentParameters) {
  const input_components = inputs.map((input, i) => (
    <div className="relative flex flex-row mr-auto" key={i}>
      <Handle
        type="target"
        position={Position.Left}
        onConnect={(params) => console.log('handle onConnect (input)', params)}
        isConnectable={true}
        id={input.name}
      />
      <label
        htmlFor={input.name}
        className="text-xs px-2.5"
      >
        {input.name || "No name"}
      </label>
    </div>
  ));

  const output_components = outputs.map((output, i) => (
    <div className="relative flex flex-row ml-auto" key={i}>
      <Handle
        type="source"
        position={Position.Right}
        onConnect={(params) => console.log('handle onConnect (input)', params)}
        isConnectable={true}
        id={output.name}
      />
      <label
        htmlFor={output.name}
        className="text-xs px-2.5"
      >
        {output.name || "No name"}
      </label>
    </div>
  ));

  return (
    <div className="w-48">
      <div className="p-2.5">
        <p className="text-base">{name}</p>
      </div>
      <div className="px-2.5 pt-2.5">
        {children}
      </div>
      <div className="p-2.5">
        <Canvas shaderTemplate={shaderTemplate} uniforms={uniforms} />
      </div>
      <div className="flex flex-row pb-2.5">
        <div className="flex flex-col w-full gap-3">{input_components}</div>
        <div className="flex flex-col w-full gap-3">{output_components}</div>
      </div>
    </div>
  );
}

export default BaseNodeComponent;
