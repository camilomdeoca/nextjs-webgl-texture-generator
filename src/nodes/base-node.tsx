import { NodeProps } from "@xyflow/react";
import { BaseNodeComponent } from "./base-node-component";
import { ChangeEvent } from "react";
import { nodeDefinitions } from "./definitions";
import useStore from "./store";
import { useShallow } from "zustand/shallow";
import { ColorControlPointsInput } from "@/components/color-control-points-input";
import { PopoverColorPicker } from "@/components/popover-color-picker";
import { HexColorInput } from "react-colorful";

function BaseNode(props: NodeProps) {
  const id = props.id;
  // console.log("RENDER NODE");
  const type = useStore(state => state.types.get(id));
  if (!type) throw new Error(`Node ${id} isn't in store.`);

  const definition = nodeDefinitions.get(type);
  if (!definition) throw new Error(`Invalid type: ${type}`);

  const values = useStore(useShallow(state => state.values.get(id)));
  if (!values) throw new Error(`Node ${id} doesnt have its own values.`);
  const setNodeValue = useStore(state => state.setNodeValue);

  const inputs = definition.parameters.map((param, i) => {
    if (param.inputType === "number") {
      const value = values[i];
      if (value.inputType !== param.inputType) {
        console.log("own", value)
        console.log("default", param.value);
        throw new Error("Invalid type in ownValues");
      }

      return (
        <label key={param.name}>
          <span className="block text-left">{param.name}</span>
          <input
            className="w-full nodrag"
            id="seed"
            type="number"
            step={param.settings.step}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setNodeValue(
              id,
              i,
              {
                inputType: param.inputType,
                value: parseFloat(e.target.value) ?? param.value,
              },
            )}
            value={value.value}
          />
        </label>
      );
    }

    if (param.inputType === "slider") {
      const value = values[i];
      if (value.inputType !== param.inputType) {
        throw new Error("Invalid type in ownValues");
      }

      return (
        <label key={param.name}>
          <span className="block text-left nodrag">{param.name}</span>
          <input
            className="w-full nodrag accent-neutral-400"
            id="seed"
            type="range"
            min={param.settings.min}
            max={param.settings.max}
            step={param.settings.step}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setNodeValue(
              id,
              i,
              {
                inputType: param.inputType,
                value: parseFloat(e.target.value) ?? param.value,
              },
            )}
            value={value.value}
          />
        </label>
      );
    }

    if (param.inputType === "color") {
      const value = values[i];
      if (value.inputType !== param.inputType) {
        throw new Error("Invalid type in ownValues");
      }

      return (
        <label key={param.name}>
          <span className="block text-left">{param.name}</span>
          <div className="grow min-w-0 flex flex-row gap-1">
            <HexColorInput
              className={`
                min-w-0 grow border border-neutral-700 rounded-md py-0.5
                px-1 focus:outline focus:outline-neutral-400
              `}
              color={value.value}
              onChange={(color) => setNodeValue(
                id,
                i,
                {
                  inputType: param.inputType,
                  value: color ?? param.value,
                },
              )}
            />
            <PopoverColorPicker
              className="nodrag"
              onChange={(color) => setNodeValue(
                id,
                i,
                {
                  inputType: param.inputType,
                  value: color ?? param.value,
                },
              )}
              color={value.value}
            />
          </div>
        </label>
      );
    }

    if (param.inputType === "colorcontrolpointarray") {
      const value = values[i];
      if (value.inputType !== param.inputType) {
        throw new Error("Invalid type in ownValues");
      }

      return (
        <div key={param.name}>
          <span className="block text-left">{param.name}</span>
          <ColorControlPointsInput
            values={value.value}
            onChange={(newControlPoints) => {
              // console.log(newControlPoints[0].lightness);
              setNodeValue(
                id,
                i,
                {
                  inputType: param.inputType,
                  value: newControlPoints,
                },
              );
            }}
          />
        </div>
      );
    }

    param satisfies never;
  });

  return (
    <BaseNodeComponent
      nodeProps={props}
      name={definition.name}
      inputs={definition.inputs}
      outputs={[{ name: "out" }]}
    >
      {inputs}
    </BaseNodeComponent>
  );
}

export default BaseNode;
