"use client";

import { useDraggable } from "@dnd-kit/core";
import Canvas from "./canvas";
import {CSS} from '@dnd-kit/utilities';
import { BaseNodeParameterDefinition, BaseNodeParameterValue } from "@/nodes/store";

type NodeCardParameters = {
  id: string,
  className?: string,
  keyName: string
  name: string,
  shaderTemplate?: string,
  parameters?: BaseNodeParameterDefinition[],
  values?: BaseNodeParameterValue[],
};

export function NodePaletteCard({
  id,
  className,
  keyName,
  name,
  shaderTemplate,
  parameters,
  values,
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
      <Canvas
        className="border border-neutral-700 rounded-sm"
        shaderTemplate={shaderTemplate}
        parameters={parameters}
        values={values}
      />
      <div className="text-sm font-normal pt-1 text-center">
        {name}
      </div>
    </div>
  );
}
