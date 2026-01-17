import { create } from "zustand";
import { NumberInput } from "./ui/number-input";
import Image from "next/image";

type State = {
  nodePreviewSize: number,
  setNodePreviewSize: (nodePreviewSize: number) => void,
};

const useSettingsStore = create<State>((set) => ({
  nodePreviewSize: 256,
  setNodePreviewSize: (nodePreviewSize) => {
    set({ nodePreviewSize });
  },
}));
export default useSettingsStore;

type SettingsProps = {
  className?: string,
  onClose: () => void,
};

export function Settings({
  className = "",
  onClose,
}: SettingsProps) {
  const nodePreviewSize = useSettingsStore(state => state.nodePreviewSize);
  const setNodePreviewSize = useSettingsStore(state => state.setNodePreviewSize);
  return <div className={className}>
    <div
      className={`
        bg-neutral-800 w-full h-full border border-neutral-700 rounded-md p-2
        shadow-center-md shadow-black
      `}
    >
      <div className="flex flex-row justify-between">
        <div className="text-lg">Settings</div>
        <button
          className={`
            cursor-pointer hover:bg-neutral-700
            rounded-md px-1
          `}
          onClick={onClose}
        >
          <Image
            className="h-full aspect-square w-5 select-none pointer-events-none"
            src="close.svg"
            alt=""
            width={5}
            height={5}
          />
        </button>
      </div>
      <div className="w-full h-px bg-neutral-700 my-2" />
      <div>
        <label className="w-full flex flex-row">
          <div className="w-1/2">Node preview size</div>
          <div className="w-1/2 flex flex-row gap-1">
            <NumberInput
              className="grow"
              min={16}
              max={4096}
              step={1}
              value={nodePreviewSize}
              onChange={setNodePreviewSize}
              align="right"
              suffix="px"
            />
          </div>
        </label>
      </div>
    </div>    
  </div>;
}
