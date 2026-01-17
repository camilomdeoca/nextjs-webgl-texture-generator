import { useEffect, useRef, useState } from "react";
import { HexColorPicker } from "react-colorful";
import { UnmountOnConditionDelayed } from "../unmount-on-condition-delayed";
import { Overlay } from "../overlay";

type PopoverColorPickerParams = {
  className?: string,
  color?: string,
  onChange?: (newColor: string) => void,
};

export default function PopoverColorPicker({
  className = "",
  color,
  onChange,
}: PopoverColorPickerParams) {
  const [isOpen, setIsOpen] = useState(false);
  useEffect(() => {
    return () => {
      console.warn("DELETED COMPONENT");
    };
  }, []);

  const colorPreviewRef = useRef<HTMLDivElement>(null);

  return (
    <div className={`${className}`}>
      <div
        style={{backgroundColor: color}}
        className={`
          w-full min-h-full flex-none border border-neutral-700 rounded-md
        `}
        onClick={() => setIsOpen(true)}
        ref={colorPreviewRef}
      />

      <UnmountOnConditionDelayed
        showCondition={isOpen}
      >
        <Overlay
          relativeTo={colorPreviewRef}
        >
          <div
            className={`
              absolute z-50
              ${isOpen
                ? "animate-fade-in-opacity"
                : "animate-fade-out-opacity pointer-events-none"}
            `}
          >
            <HexColorPicker color={color} onChange={onChange} />
          </div>
          {isOpen ? <div
            onMouseDown={() => setIsOpen(false)}
            className="fixed inset-0 z-40"
          /> : null}
        </Overlay>
      </UnmountOnConditionDelayed>
    </div>
  );
};
