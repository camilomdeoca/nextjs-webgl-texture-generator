"use client";

import { nodeDefinitions } from "@/nodes/definitions";
import { useMemo } from "react";
import { NodePaletteCard } from "./nodes/node-palette-card";

type NodesPaletteParameters = {
  className?: string,
};

export default function NodesPalette({
  className,
}: NodesPaletteParameters) {
  const data = useMemo(() => {
    const result = nodeDefinitions.entries().map(([key, { name }]) => {
      return { key, name };
    }).toArray();

    return result;
  }, []);

  return (
    <div
      className={`
        grid grid-cols-2 gap-2 p-2
        bg-neutral-800 text-sm font-medium relative
        border-r border-neutral-700 content-start
        ${className}
      `}
    >
      {data.map(({ key, name }) => (
        <NodePaletteCard
          id={`${key}_palette_card`}
          key={key}
          keyName={key}
          name={name}
        />
      ))}
    </div>
  );
}
