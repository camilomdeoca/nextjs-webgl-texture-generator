import { NodeProps } from "@xyflow/react";
import { BaseNodeComponent } from "./base-node-component";
import { ChangeEvent } from "react";
import { nodeDefinitions } from "./definitions";
import useStore from "./store";
import { useShallow } from "zustand/shallow";
import { ColorPicker } from "@/components/color-picker";

function BaseNode(props: NodeProps) {
  const id = props.id;
  // console.log("RENDER NODE");
  const type = useStore(state => state.types.get(id));
  if (!type) throw new Error(`Node ${id} isn't in store.`);

  const definition = nodeDefinitions.get(type);
  if (!definition) throw new Error(`Invalid type: ${type}`);

  const ownValues = useStore(useShallow(state => state.ownValues.get(id)));
  if (!ownValues) throw new Error(`Node ${id} doesnt have its own values.`);
  const setNodeValue = useStore(state => state.setNodeValue);

  const inputs = definition.parameters.map((param, i) => {
    if (param.inputType === "number") {
      const ownValue = ownValues[i];
      if (ownValue.type !== param.defaultValue.type) {
        console.log("own", ownValue)
        console.log("default", param.defaultValue);
        throw new Error("Invalid type in ownValues");
      }

      return (
        <div key={param.name}>
          <label className="block text-left" htmlFor="seed">{param.name}</label>
          <input
            className="w-full nodrag"
            id="seed"
            type="number"
            step={param.step}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setNodeValue(
              id,
              i,
              {
                type: param.defaultValue.type,
                value: parseFloat(e.target.value) ?? param.defaultValue.value,
              },
            )}
            value={ownValue.value}
          />
        </div>
      );
    }

    if (param.inputType === "slider") {
      const ownValue = ownValues[i];
      if (ownValue.type !== param.defaultValue.type)
        throw new Error("Invalid type in ownValues");

      return (
        <div key={param.name}>
          <label className="block text-left" htmlFor="seed">{param.name}</label>
          <input
            className="w-full nodrag accent-neutral-400"
            id="seed"
            type="range"
            min={param.min}
            max={param.max}
            step={param.step}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setNodeValue(
              id,
              i,
              {
                type: param.defaultValue.type,
                value: parseFloat(e.target.value) ?? param.defaultValue.value,
              },
            )}
            value={ownValue.value}
          />
        </div>
      );
    }
    
    if (param.inputType === "color") {
      const ownValue = ownValues[i];
      if (ownValue.type !== param.defaultValue.type)
        throw new Error("Invalid type in ownValues");

      return (
        <div key={param.name}>
          <label className="block text-left" htmlFor="seed">{param.name}</label>
          <ColorPicker
            className="w-full nodrag"
            id="seed"
            onChange={(color) => setNodeValue(
              id,
              i,
              {
                type: param.defaultValue.type,
                value: color ?? param.defaultValue.value,
              },
            )}
            value={ownValue.value}
          />
        </div>
      );
    }
    
    if (param.inputType === "colorarray") {
      const ownValue = ownValues[i];
      if (ownValue.type !== param.defaultValue.type)
        throw new Error("Invalid type in ownValues");

      return (
        <div key={param.name}>
          <label className="block text-left" htmlFor="seed">{param.name}</label>
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
