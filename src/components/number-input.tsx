import Image from "next/image";
import { useEffect, useRef, useState } from "react";

type NumberInputParams = {
  className?: string,
  value?: number,
  onChange?: (value: number) => void,
  min?: number,
  max?: number,
  step?: number,
};

export function NumberInput({
  className = "",
  value,
  onChange,
  min = -Infinity,
  max = +Infinity,
  step = 1,
}: NumberInputParams) {
  if (min > max) throw new Error("`min` in input range is higher than `max`.");

  const [inputValue, setInputValue] = useState(() => value?.toLocaleString() ?? "");

  useEffect(() => {
    if (value === undefined) return;
    if (value.toString() !== inputValue && Math.abs(Number(inputValue) - value) > 1e-12) {
      setInputValue(value.toString());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const stepValue = (stepSigned: number) => {
    setInputValue(prev => {
      const newValue = ["", ".", "-", "-."].includes(prev)
        ? 0
        : Number(prev) + stepSigned;
      return newValue.toLocaleString();
    });
  };

  useEffect(() => {
    if (["", ".", "-", "-."].includes(inputValue)) return;
    if (value === undefined
      || Math.abs(Number(inputValue) - value) > 1e-12
    ) {
      if (onChange) onChange(Number(inputValue));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputValue, onChange]);

  const holdTimeout = useRef<NodeJS.Timeout | null>(null);
  const holdInterval = useRef<NodeJS.Timeout | null>(null);

  return <div className={className}>
    <div className={`
      flex flex-row gap-1 w-full
      border border-neutral-700 rounded-md focus-within:border-neutral-400
    `}>
      <input
        className={`
          w-full border-0 focus:outline-0 px-1 py-0.5
        `}
        value={inputValue}
        onChange={ev => {
          const regex = RegExp(`^${min < 0 ? "-" : ""}${max < 0 ? "" : "?"}[0-9]*\\.?[0-9]*$`);
          if (!regex.test(ev.target.value)) return;
          if (["", ".", "-", "-."].includes(ev.target.value)) {
            setInputValue(ev.target.value);
            return;
          };
          const valueAsNumber = Number(ev.target.value);
          if (valueAsNumber < min || valueAsNumber > max) return;
          setInputValue(ev.target.value);
        }}
      />
      <div className="flex flex-col w-3 border-l border-l-neutral-700">
        <button
          className={`
            cursor-pointer hover:bg-neutral-700 rounded-tr-sm m-auto grow
          `}
          onMouseDown={() => {
            stepValue(step);
            holdTimeout.current = setTimeout(() => {
              holdInterval.current = setInterval(() => {
                stepValue(step);
              }, 100);
            }, 400);
          }}
          onMouseUp={() => {
            if (holdTimeout.current) clearTimeout(holdTimeout.current);
            if (holdInterval.current) clearInterval(holdInterval.current);
          }}
        ><Image className="h-full w-full" src="triangle_up.svg" alt="" width={5} height={5}/></button>
        <button
          className={`
            cursor-pointer hover:bg-neutral-700 rounded-br-sm m-auto grow
          `}
          onMouseDown={() => {
            stepValue(-step);
            holdTimeout.current = setTimeout(() => {
              holdInterval.current = setInterval(() => {
                stepValue(-step);
              }, 100);
            }, 400);
          }}
          onMouseUp={() => {
            if (holdTimeout.current) clearTimeout(holdTimeout.current);
            if (holdInterval.current) clearInterval(holdInterval.current);
          }}
        ><Image className="h-full w-full" src="triangle_down.svg" alt="" width={5} height={5}/></button>
      </div>
    </div>
  </div>;
}
