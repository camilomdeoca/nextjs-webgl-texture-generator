import { NodeProps } from "@xyflow/react";
import { BaseNodeComponent } from "./base-node-component";
import { ChangeEvent } from "react";
import { nodeDefinitions } from "./definitions";
import useStore from "./store";
import { useShallow } from "zustand/shallow";

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

  const inputs = definition.parameters.map(({ name, inputType, defaultValue }, i) => {
    return (
      <div key={name}>
        <label className="block text-left" htmlFor="seed">{name}</label>
        <input
          className="w-full nodrag"
          id="seed"
          type={inputType}
          step={0.001}
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            setNodeValue(id, i, parseFloat(e.target.value) || defaultValue);
          }}
          value={ownValues[i]} // TODO: Do something better (might not be a number)
        />
      </div>
    );
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
