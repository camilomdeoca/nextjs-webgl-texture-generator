import { DragOverlay, useDraggable } from "@dnd-kit/core";
import {CSS} from '@dnd-kit/utilities';
import Image from "next/image";

type NodeCardParameters = {
  id: string,
  className?: string,
  keyName: string
  name: string,
};

export default function NodePaletteCard({
  id,
  className,
  keyName,
  name,
}: NodeCardParameters) {
  const {attributes, listeners, setNodeRef, isDragging} = useDraggable({
    id,
    data: {
      nodeTypeKey: keyName,
    },
  });

  const card = (
    <div
      ref={setNodeRef}
      className={className + `
        p-1.5 border border-neutral-700 rounded-md hover:shadow-center-sm shadow-neutral-400
        transition-shadow h-fit bg-neutral-800 ${isDragging ? "cursor-grabbing" : "cursor-grab"}
      `}
      {...listeners}
      {...attributes}
    >
      <Image
        className="w-full"
        src={`./node_icons/${keyName}.png`}
        alt=""
        width={50}
        height={50}
      />
      <div className="text-sm font-normal pt-1 text-center">
        {name}
      </div>
    </div>
  );

  return <>
    {isDragging ? <div /> : card}
    {isDragging && <DragOverlay>
      {card}
    </DragOverlay>}
  </>;
}
