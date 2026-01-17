import { NodeProps } from "@xyflow/react";
import { useShallow } from "zustand/shallow";
import { HexColorInput } from "react-colorful";
import { useStore } from "@/nodes/store";
import { nodeDefinitions } from "@/nodes/definitions";
import { PopoverColorPicker } from "@/components/ui/popover-color-picker";
import { ColorControlPointsInput } from "@/components/ui/color-control-points-input";
import { BaseNodeComponent } from "../base-node-component";
import { NumberInput } from "@/components/ui/number-input";
import { Slider } from "@/components/ui/slider";

export default function BaseNode(props: NodeProps) {
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
          <NumberInput
            className="w-full nodrag"
            step={param.settings.step}
            onChange={value => setNodeValue(
              id,
              i,
              {
                inputType: param.inputType,
                value,
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
          <Slider
            className="w-full nodrag"
            min={param.settings.min}
            max={param.settings.max}
            step={param.settings.step}
            showValue
            onChange={value => setNodeValue(
              id,
              i,
              {
                inputType: param.inputType,
                value,
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
                px-1 focus:border-neutral-400 outline-0 transition-colors
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
              className="nodrag w-8"
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
