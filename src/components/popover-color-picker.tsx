import { useEffect, useMemo, useRef, useState } from "react";
import { HexColorPicker } from "react-colorful";
import { createPortal } from "react-dom";
import { UnmountOnConditionDelayed } from "./unmount-on-condition-delayed";

type PopoverColorPickerParams = {
  className?: string,
  color?: string,
  onChange?: (newColor: string) => void,
};

export const PopoverColorPicker = ({
  className = "",
  color,
  onChange,
}: PopoverColorPickerParams) => {
  const [isOpen, setIsOpen] = useState(false);
  useEffect(() => {
    return () => {
      console.warn("DELETED COMPONENT");
    };
  }, []);

  const overlayPortal = document.getElementById("overlay-portal");

  if (!overlayPortal) throw new Error("Couldn't get overlay portal element.");

  const colorPreviewRef = useRef<HTMLDivElement>(null);

  const [pos, setPos] = useState<{ x: number, y: number } | null>(null);

  useEffect(() => {
    setPos(() => {
      const rect = colorPreviewRef.current?.getBoundingClientRect();
      const x = rect?.x;
      const y = rect ? rect.y + rect.height : undefined;
      return x && y ? { x: x, y: y } : null;
    });
  }, [isOpen])

  const delay = useMemo(() =>
    parseInt(
      getComputedStyle(document.documentElement)
        .getPropertyValue("--default-transition-duration"),
      10,
    ),
    [],
  );

  return (
    <div className={`${className}`}>
      <div
        style={{backgroundColor: color}}
        className={`
          w-8 min-h-full flex-none border border-neutral-700 rounded-md
        `}
        onClick={() => setIsOpen(true)}
        ref={colorPreviewRef}
      />

      <UnmountOnConditionDelayed
        showCondition={isOpen}
        delay={delay}
      >
        {createPortal(
          <div>
            <div
              style={{top: pos?.y ?? 0, left: pos?.x ?? 0}}
              className={`
                absolute z-10
                ${isOpen
                  ? "animate-fade-in-opacity"
                  : "animate-fade-out-opacity pointer-events-none"}
              `}
            >
              <HexColorPicker color={color} onChange={onChange} />
            </div>
            {isOpen ? <div
              onMouseDown={() => setIsOpen(false)}
              className="fixed inset-0"
            /> : null}
          </div>,
          overlayPortal,
        )}
      </UnmountOnConditionDelayed>
    </div>
  );
};
