import { Handle, NodeProps, Position } from "@xyflow/react";
import { ReactNode } from "react";
import { OneConnectionHandle } from "../one-connection-handle";
import { useStore, useCustomComparison, getParametersFromNode } from "@/nodes/store";
import { NodePreviewCanvas } from "../node-preview-canvas";
import { useShallow } from "zustand/shallow";

export type BaseNodeComponentParameters = {
  nodeProps: NodeProps,
  name: string,
  // parameters: { name: string, type: string }[],
  inputs: { name: string, handleId: string }[],
  outputs: { name: string }[],
  children?: ReactNode,
};

export default function BaseNodeComponent({
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
      <span
        className="text-xs px-2.5"
      >
        {input.name}
      </span>
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
      <span
        className="text-xs px-2.5"
      >
        {output.name}
      </span>
    </div>
  ));

  const id = nodeProps.id;

  const template = useStore(state => state.templates.get(id));
  const parameters = useStore(useCustomComparison(
    state => getParametersFromNode(state, id),
    (a, b) => {
      if (a === b) return true;
      if (a === undefined || b === undefined) return false;
      return a.every((_, i) => {
        return a[i].uniformName === b[i].uniformName
          && a[i].id === b[i].id
          && a[i].value == b[i].value;
      });
    },
  ));

  const {
    pickingNode,
    pickNode,
  } = useStore(useShallow(state => ({
    pickingNode: state.pickNodeCallback !== undefined,
    pickNode: state.pickNode,
  })));

  return (
    <div
      className={`
        flex flex-col text-center text-xs text-neutral-100
        w-48 border bg-neutral-800 rounded-lg
        shadow-md shadow-black hover:shadow-center-md hover:shadow-neutral-400
        outline-0 transition-[border-color,box-shadow]
        ${nodeProps.selected ? "border-neutral-400" : "border-neutral-700"}
      `}
    >
      {pickingNode && <div
        className={`
          absolute w-full h-full z-10
          border-3 border-amber-400/50 bg-neutral-950/50
          rounded-lg cursor-crosshair
        `}
        onClick={() => pickNode(id)}
      />}
      <div className="p-2.5">
        <p className="text-base">{name}</p>
      </div>
      <div className="px-2.5 pt-2.5 flex flex-col gap-2">
        {children}
      </div>
      <div className="p-2.5">
        <NodePreviewCanvas
          shaderTemplate={template}
          parameters={parameters}
        />
      </div>
      <div className="flex flex-row pb-2.5">
        <div className="flex flex-col w-full gap-3">{input_components}</div>
        <div className="flex flex-col w-full gap-3">{output_components}</div>
      </div>
    </div>
  );
}
