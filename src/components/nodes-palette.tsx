import { nodeDefinitions } from "@/nodes/definitions";
import { useMemo } from "react";
import { prependUniformVariablesWithId } from "@/glsl-parsing/glsl-templates";
import { NodePaletteCard } from "./node-palette-card";

type NodesPaletteParameters = {
  className?: string,
};

export default function NodesPalette({
  className,
}: NodesPaletteParameters) {
  const data = useMemo(() => {
    const result = nodeDefinitions.entries().map(([key, { name, template, parameters, inputs }]) => {
      if (inputs.length > 0) {
        return {
          name,
          key,
          template: undefined,
          parameters: undefined,
        };
      }
      const definitions = parameters.map(({ name, uniformName, uniformType, inputType }) => ({
        name,
        id: "",
        uniformName,
        uniformType,
        inputType,
      }))
      
      const values = parameters.map(({ defaultValue }) => { return defaultValue; });

      const templateProcessed = prependUniformVariablesWithId(
        "",
        template,
        parameters.map(({ uniformName }) => uniformName),
      );

      return {
        key,
        name, 
        template: templateProcessed,
        parameters: {
          definitions,
          values,
        },
      };
    }).toArray();

    return result;
  }, []);

  return (
    <div
      className={className + `
        grid grid-cols-2 gap-2 p-2
        bg-neutral-800 text-sm font-medium relative
        border-r border-neutral-700
      `}
    >
      {data.map(({ key, name, template, parameters }) => (
        <NodePaletteCard
          id={`${key}_palette_card`}
          key={key}
          keyName={key}
          name={name}
          shaderTemplate={template}
          parameters={parameters}
        />
      ))}
    </div>
  );
}
