"use client";

import { useDraggable } from "@dnd-kit/core";
import {CSS} from '@dnd-kit/utilities';
import { BaseNodeParameterDefinition } from "@/nodes/store";
import Image from "next/image";
import { NodePreviewCanvas } from "../node-preview-canvas";

type NodeCardParameters = {
  id: string,
  className?: string,
  keyName: string
  name: string,
  shaderTemplate?: string,
  parameters?: BaseNodeParameterDefinition[],
};

export default function NodePaletteCard({
  id,
  className,
  keyName,
  name,
  shaderTemplate,
  parameters,
}: NodeCardParameters) {
  const {attributes, listeners, setNodeRef, transform, isDragging} = useDraggable({
    id,
    data: {
      nodeTypeKey: keyName,
    },
  });

  const style = { transform: CSS.Translate.toString(transform) };

  return (
    <div
      ref={setNodeRef}
      className={className + `
        p-1.5 border border-neutral-700 rounded-md hover:shadow-center-sm shadow-neutral-400
        transition-shadow h-fit bg-neutral-800 ${isDragging ? "cursor-grabbing" : "cursor-grab"}
      `}
      style={style}
      {...listeners}
      {...attributes}
    >
      {parameters
        ? <NodePreviewCanvas
          className="border border-neutral-700 rounded-sm"
          shaderTemplate={shaderTemplate}
          parameters={parameters}
        />
        : <Image
          className="w-full"
          src={`./node_icons/${keyName}.png`}
          alt=""
          width={50}
          height={50}
        />}
      <div className="text-sm font-normal pt-1 text-center">
        {name}
      </div>
    </div>
  );
}
