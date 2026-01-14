import { useRef, useState } from "react";

type SliderParams = {
  className?: string,
  value: number,
  onChange?: (value: number) => void,
  min: number,
  max: number,
  step?: number,
  showValue?: boolean,
  showRange?: boolean,
};

export default function Slider({
  className,
  value,
  onChange,
  min,
  max,
  step,
  showValue = false,
  showRange = false,
}: SliderParams) {
  if (min > max) {
    throw new Error("Slider params error: `min` is higher than `max`.");
  }

  const ref = useRef<HTMLDivElement>(null);

  const [savedOnMouseMove, setSavedOnMouseMove] = useState<
    ((this: GlobalEventHandlers, ev: MouseEvent) => unknown) | null
  >(null);
  const [savedOnMouseUp, setSavedOnMouseUp] = useState<
    ((this: GlobalEventHandlers, ev: MouseEvent) => unknown) | null
  >(null);
  
  const handleMouseUp = () => {
    document.onmousemove = savedOnMouseMove;
    document.onmouseup = savedOnMouseUp;
    setSavedOnMouseMove(null);
    setSavedOnMouseUp(null);
  };

  const handleMouseMove = (ev: MouseEvent | React.MouseEvent) => {
    if (!ref.current)
      throw new Error("Handle clicked before getting slider reference.");

    const rect = ref.current.getBoundingClientRect();
    const relativeX = ev.pageX - rect.x;
    let sliderProgress = (relativeX / rect.width);
    if (sliderProgress > 1.0) sliderProgress = 1.0;
    if (sliderProgress < 0.0) sliderProgress = 0.0;

    let newValue = min + sliderProgress * (max - min);
    if (step !== undefined) {
      newValue = Math.round(newValue / step) * step;
    }

    onChange?.(newValue);
  };

  const progress = ((value - min) / (max - min)) * 100;

  return <div className={className}>
    <div className="w-full flex flex-col items-center">
      <div
        ref={ref}
        className="w-full h-4 relative cursor-pointer group"
        onMouseDown={(ev) => {
          setSavedOnMouseMove(document.onmousemove);
          setSavedOnMouseUp(document.onmouseup);
          handleMouseMove(ev);
          document.onmousemove = handleMouseMove;
          document.onmouseup = handleMouseUp;
        }}
      >
        <div
          className={`
            absolute w-full h-2 top-1/2 -translate-y-1/2 bg-neutral-800 border
            border-neutral-700 rounded-sm
          `}
        />
        <div
          style={{ width: `${progress}%` }}
          className={`
            absolute h-2 top-1/2 -translate-y-1/2 bg-neutral-600
            border border-neutral-700 rounded-sm left-0
            group-focus-within:border-neutral-400 transition-colors
            group-active:bg-neutral-400
            group-hover:bg-neutral-500
          `}
        />
        <input
          style={{ left: `${progress}%` }}
          className={`
            absolute w-3.5 h-3.5 top-1/2 -translate-1/2 bg-neutral-600
            border border-neutral-700 rounded-full
            focus:border-neutral-400 transition-colors
            appearance-none
            [&::-webkit-slider-thumb]:appearance-none
            cursor-pointer
            group-active:bg-neutral-400
            group-hover:bg-neutral-500
          `}
          type="range"
          value={value}
          min={min}
          max={max}
          step={step}
        />
        {showValue && <div
          style={{ left: `${progress}%` }}
          className={`
            absolute -translate-y-7 -translate-x-1/2 bg-neutral-800 px-1 py-0.5
            border border-neutral-700 rounded-md text-xs
            opacity-0 group-hover:opacity-100 transition-opacity
            
            before:content-[''] before:absolute before:bg-neutral-800
            before:w-1.5 before:h-1.5
            before:left-1/2 before:bottom-0
            before:transform-[translate(-50%,50%)translate(0,0.7px)rotate(45deg)]
            before:border-b before:border-r before:border-neutral-700
          `}
        >
          {value.toLocaleString(
            undefined,
            {
              useGrouping: false,
              minimumFractionDigits: (step === undefined || step <= 0)
                ? undefined
                : Math.floor(-Math.log10(step)),
              maximumFractionDigits: (step === undefined || step <= 0)
                ? undefined
                : Math.floor(-Math.log10(step)),
              maximumSignificantDigits: (step === undefined || step <= 0)
                ? 3
                : undefined,
            },
          )}
        </div>}
      </div>
      {showRange && <div
        className="flex flex-row justify-between w-full text-xs"
      >
        <div>{min}</div>
        <div>{max}</div>
      </div>}
    </div>
  </div>;
}
