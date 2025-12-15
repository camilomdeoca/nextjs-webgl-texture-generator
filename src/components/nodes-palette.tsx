import { nodeDefinitions } from "@/nodes/definitions";
import Canvas from "./canvas";
import { useMemo } from "react";
import { prependUniformVariablesWithId } from "@/glsl-parsing/glsl-templates";
import { useDraggable } from "@dnd-kit/core";
import {CSS} from '@dnd-kit/utilities';

type NodeCardParameters = {
  id: string,
  className?: string,
  keyName: string
  name: string,
  shaderTemplate?: string,
  parameters?: {
    definitions: {
      name: string,
      id: string,
      uniformName: string,
      uniformType: string,
      inputType: string,
    }[],
    values: unknown[],
  },
};

function NodeCard({
  id,
  className,
  keyName,
  name,
  shaderTemplate,
  parameters,
}: NodeCardParameters) {
  const {attributes, listeners, setNodeRef, transform} = useDraggable({
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
        transition-shadow h-fit bg-neutral-800
      `}
      style={style}
      {...listeners}
      {...attributes}
    >
      <Canvas
        className="border border-neutral-700 rounded-sm"
        shaderTemplate={shaderTemplate}
        parameters={parameters}
      />
      <div className="text-sm font-normal pt-1 text-center">
        {name}
      </div>
    </div>
  );
}

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
        <NodeCard
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
