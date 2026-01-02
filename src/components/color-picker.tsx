import { useEffect, useState } from "react";
import { shallow } from "zustand/shallow";

function hexToRgba(hex: string): [number, number, number, number] {
  const clean = hex.replace(/^#/, '');

  if (![3, 4, 6, 8].includes(clean.length)) {
    throw new Error(`Invalid hex color: ${hex}`);
  }

  const expand = (s: string) =>
    s.length === 1 ? s + s : s;

  let r: string, g: string, b: string, a: string = 'ff';

  if (clean.length <= 4) {
    r = expand(clean[0]);
    g = expand(clean[1]);
    b = expand(clean[2]);
    if (clean.length === 4) a = expand(clean[3]);
  } else {
    r = clean.slice(0, 2);
    g = clean.slice(2, 4);
    b = clean.slice(4, 6);
    if (clean.length === 8) a = clean.slice(6, 8);
  }

  return [
    parseInt(r, 16) / 255,
    parseInt(g, 16) / 255,
    parseInt(b, 16) / 255,
    parseInt(a, 16) / 255,
  ];
}

function rgbaToHex(rgba: [number, number, number, number]): string {
  return rgba.reduce((acc, value) => {
    return `${acc}${(value*255).toString(16).padStart(2, "0")}`;
  }, "#");
}

type ColorPickerParams = {
  className?: string,
  id?: string,
  onChange: (value: [number, number, number, number]) => void,
  value: [number, number, number, number],
};

export function ColorPicker({
  className,
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
        className="min-w-20 grow"
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
        className="w-8 min-h-full flex-none m- border border-neutral-700 rounded-md"
      />
    </div>
  );
}
