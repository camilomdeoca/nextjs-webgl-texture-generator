import { useStore } from "@/nodes/store";
import Image from "next/image";
import { useCallback } from "react";
import { useShallow } from "zustand/shallow";
import Button from "../button/button";

type NodePickerParams = {
  className?: string,
  value?: string,
  onChange?: (id: string | undefined) => void,
  label?: string,
  unsettable?: boolean,
};

export default function NodePicker({
  className,
  value,
  onChange,
  label,
  unsettable = true,
}: NodePickerParams) {
  const handleNodePicked = useCallback((id: string) => {
    onChange?.(id);
  }, [onChange]);

  const {
    requestPickNode,
    pickingNode,
  } = useStore(useShallow(state => ({
    requestPickNode: state.requestPickNode,
    pickingNode: state.pickNodeCallback === handleNodePicked,
  })));

  return <div className={className}>
    <div className={`
      flex flex-row border border-neutral-700 w-full h-full rounded-md overflow-hidden gap-1
    `}>
      <button
        className={`
          group flex flex-row gap-1 grow
          ${pickingNode ? "" : "cursor-pointer"}
        `}
        onClick={() => requestPickNode(pickingNode ? undefined : handleNodePicked)}
      >
        <div className={`
          p-1
          ${pickingNode
            ? "bg-neutral-400"
            : "bg-neutral-700 group-hover:bg-neutral-600 group-active:bg-neutral-400"}
        `}>
          {label}
        </div>
        <div className="p-1 grow text-left">
          {value}
        </div>
      </button>
      {unsettable && value !== undefined && <Button
        className="my-auto mr-0.5"
        onClick={() => onChange?.(undefined)}
      >
        <Image
          className="h-full aspect-square w-4 select-none pointer-events-none"
          src="close.svg"
          alt=""
          width={5}
          height={5}
        />
      </Button>}
    </div>
  </div>;
}
