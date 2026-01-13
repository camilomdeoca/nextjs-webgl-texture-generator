import Image from "next/image";
import { ReactNode, useCallback, useEffect, useRef, useState } from "react";

type NumberInputParams = {
  className?: string,
  value?: number,
  onChange?: (value: number) => void,
  min?: number,
  max?: number,
  step?: number,
  align?: "right" | "left",
  suffix?: ReactNode,
};

export function NumberInput({
  className = "",
  value,
  onChange,
  min = -Infinity,
  max = +Infinity,
  step = 1,
  align = "left",
  suffix,
}: NumberInputParams) {
  if (min > max) throw new Error("NumberInput params error: `min` is higher than `max`.");

  const [inputValue, setInputValue] = useState(() => {
    return value?.toLocaleString(undefined, { useGrouping: false }) ?? "";
  });
  const [isValid, setIsValid] = useState(true);

  useEffect(() => {
    if (value === undefined) return;
    if (Math.abs(Number(inputValue) - value) > 1e-12) {
      setInputValue(value.toString());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const stepValue = (stepSigned: number) => {
    setInputValue(prev => {
      const valueAsNumber = parseFloat(prev);
      if (isNaN(valueAsNumber)) return "0";
      return ((Math.round(valueAsNumber / stepSigned) + 1) * stepSigned)
        .toLocaleString(undefined, { useGrouping: false });
    });
  };

  useEffect(() => {
    const inputValueAsNumber = parseFloat(inputValue);
    // If we are in the process of writing a number but there isnt a valid number yet
    // then update inputValue but do not call the onChange function.
    if (isNaN(inputValueAsNumber)) return;
    if (value === undefined || Math.abs(inputValueAsNumber - value) > 1e-12) {
      const newIsValid = inputValueAsNumber >= min && inputValueAsNumber <= max;
      setIsValid(newIsValid);
      if (newIsValid) onChange?.(inputValueAsNumber);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputValue, onChange]);

  const holdTimeout = useRef<NodeJS.Timeout | null>(null);
  const holdInterval = useRef<NodeJS.Timeout | null>(null);

  const stopRepeating = useCallback(() => {
    if (holdTimeout.current) clearTimeout(holdTimeout.current);
    if (holdInterval.current) clearInterval(holdInterval.current);
  }, []);

  return <div className={className}>
    <div className={`
      flex flex-row gap-1 w-full
      border border-neutral-700 rounded-md focus-within:border-neutral-400
      transition-colors overflow-hidden
      ${isValid ? "border-neutral-700" : "focus-within:border-red-400 border-red-700"}
    `}>
      <input
        className={`
          w-full border-0 focus:outline-0 px-1 py-0.5
          ${align === "left" ? "text-left" : "text-right"}
        `}
        value={inputValue}
        onChange={ev => {
          const regex = RegExp(
            "^" +
            // `-` sign, mandatory if valid range is all negative
            (min < 0 ? `-${max < 0 ? "" : "?"}` : "") +
            // Integer part of the number
            "\\d*" +
            // Fractional part of the number (if step is not an integer)
            (Number.isInteger(step) ? "" : "\\.?\\d*") +
            "$"
          );
          if (!regex.test(ev.target.value)) return;
          setInputValue(ev.target.value);
        }}
      />
      {suffix && <div className="pr-1 py-0.5">{suffix}</div>}
      <div className="flex flex-col w-3 border-l border-l-neutral-700">
        <button
          className={`
            cursor-pointer hover:bg-neutral-700 m-auto grow transition-colors
          `}
          onMouseDown={() => {
            stepValue(step);
            holdTimeout.current = setTimeout(() => {
              holdInterval.current = setInterval(() => {
                stepValue(step);
              }, 100);
            }, 400);
          }}
          onMouseUp={stopRepeating}
          onBlur={stopRepeating}
        >
          <Image
            className="h-full w-full select-none pointer-events-none"
            src="keyboard_arrow_up.svg"
            alt=""
            width={5}
            height={5}
          />
        </button>
        <button
          className={`
            cursor-pointer hover:bg-neutral-700 m-auto grow transition-colors
          `}
          onMouseDown={() => {
            stepValue(-step);
            holdTimeout.current = setTimeout(() => {
              holdInterval.current = setInterval(() => {
                stepValue(-step);
              }, 100);
            }, 400);
          }}
          onMouseUp={stopRepeating}
          onBlur={stopRepeating}
        >
          <Image
            className="h-full w-full select-none pointer-events-none"
            src="keyboard_arrow_down.svg"
            alt=""
            width={5}
            height={5}
          />
        </button>
      </div>
    </div>
  </div>;
}
