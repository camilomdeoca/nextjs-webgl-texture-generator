import { hexToRgba, rgbaToHex } from "@/utils/colors";
import { useEffect, useState } from "react";
import { shallow } from "zustand/shallow";

type ColorPickerParams = {
  className?: string,
  colorPreviewClassName?: string,
  id?: string,
  onChange: (value: [number, number, number, number]) => void,
  value: [number, number, number, number],
};

export function ColorPicker({
  className,
  colorPreviewClassName,
  id,
  onChange,
  value = [0, 0, 0, 0],
}: ColorPickerParams) {
  const [inputText, setInputText] = useState(() => rgbaToHex(value));
  const [lastValidInputText, setLastValidInputText] = useState(() => rgbaToHex(value));

  useEffect(() => {
    if (shallow(hexToRgba(lastValidInputText), value)) return;
    queueMicrotask(() => setInputText(rgbaToHex(value)));
  }, [lastValidInputText, value]);

  return (
    <div className={`flex flex-row gap-1 ${className}`}>
      <input
        id={id}
        className="min-w-0 grow"
        type="text"
        onChange={(e) => {
          const text = e.target.value;
          if (!/^#?[0-9A-Fa-f]{0,8}$/.test(text)) return;

          setInputText(text);

          try {
            const rgba = hexToRgba(text);
            setLastValidInputText(text);
            onChange(rgba);
          } catch {
          }
        }}
        value={inputText}
      />
      <div
        style={{backgroundColor: rgbaToHex(value)}}
        className={`
          w-8 min-h-full flex-none border border-neutral-700 rounded-md
          ${colorPreviewClassName}
        `}
      />
    </div>
  );
}
