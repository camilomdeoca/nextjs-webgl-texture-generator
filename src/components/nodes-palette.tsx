import { nodeDefinitions } from "@/nodes/definitions";
import Canvas from "./canvas";
import { useMemo } from "react";
import { prependUniformVariablesWithId } from "@/glsl-parsing/glsl-templates";

type NodesPaletteParameters = {
  className?: string,
};

export default function NodesPalette({
  className,
}: NodesPaletteParameters) {
  const data = useMemo(() => {
    const result = nodeDefinitions.entries().map(([key, {template, parameters, inputs}]) => {
      if (inputs.length > 0) {
        return {
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
        key: key,
        template: templateProcessed,
        parameters: {
          definitions,
          values,
        },
      };
    }).toArray();

    console.log(result);
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
      {data.map(({ key, template, parameters }) => (
        <div key={key}>
          <div className="p-1.5 border border-neutral-700 rounded-md hover:bg-neutral-700">
            <Canvas
              shaderTemplate={template}
              parameters={parameters}
            />
            <div className="text-sm font-normal pt-1 text-center">
              {key}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
