import { useCallback, useEffect, useRef, useState } from "react";
import { hexToRgba, rgbaToHex } from "@/utils/colors";
import { HexColorInput } from "react-colorful";
import { PopoverColorPicker } from "../popover-color-picker";
import Image from "next/image";

export type ColorControlPoint = {
  color: string,
  lightness: number,
};

type ColorControlPointsInputParams = {
  className?: string,
  values: ColorControlPoint[],
  onChange: (values: ColorControlPoint[]) => void,
};

function getColorAtLightness(
  values: ColorControlPoint[],
  lightness: number,
): string | undefined {
  if (values.length === 0) throw new Error("No control points.");
  let closestLower = -1;
  let closestUpper = -1;
  values.forEach((controlPoint, i) => {
    if (
      controlPoint.lightness <= lightness
      && (closestLower < 0 || controlPoint.lightness > values[closestLower].lightness)
    ) closestLower = i;
    if (
      controlPoint.lightness >= lightness
      && (closestUpper < 0 || controlPoint.lightness < values[closestUpper].lightness)
    ) closestUpper = i;
  });

  if (closestLower < 0) return values[closestUpper].color;
  if (closestUpper < 0) return values[closestLower].color;
  if (values[closestLower].lightness === values[closestUpper].lightness)
    return values[closestLower].color;

  const factor
    = (lightness - values[closestLower].lightness)
    / (values[closestUpper].lightness - values[closestLower].lightness);

  const result: [number, number, number, number] = [0, 0, 0, 0];
  const colorLower = hexToRgba(values[closestLower].color);
  const colorUpper = hexToRgba(values[closestUpper].color);
  if (!colorLower) return undefined;
  if (!colorUpper) return undefined;
  for (let i = 0; i < result.length; i++) {
    result[i]
      = colorLower[i] * (1.0 - factor)
      + colorUpper[i] * (      factor)
  }
  return rgbaToHex(result);
}

export default function ColorControlPointsInput({
  className,
  values,
  onChange,
}: ColorControlPointsInputParams) {
  const [dragging, setDragging] = useState(false);
  const [savedCallbacks, setSavedCallbacks] = useState<{
    onmousemove: ((this: GlobalEventHandlers, ev: MouseEvent) => unknown) | null,
    onmouseup: ((this: GlobalEventHandlers, ev: MouseEvent) => unknown) | null,
    ontouchmove: ((this: GlobalEventHandlers, ev: TouchEvent) => unknown) | null | undefined,
    ontouchend: ((this: GlobalEventHandlers, ev: TouchEvent) => unknown) | null | undefined,
  }>({
    onmousemove: null,
    onmouseup: null,
    ontouchmove: null,
    ontouchend: null,
  });

  type MouseOrTouchEvent = MouseEvent | React.MouseEvent | TouchEvent | React.TouchEvent;

  const [stackingOrder, setStackingOrder] = useState(() => Array.from(values, (_, i) => i))

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleEnd = useCallback(() => {
    setDragging(false);
    document.onmousemove = savedCallbacks.onmousemove;
    document.onmouseup = savedCallbacks.onmouseup;
    document.ontouchmove = savedCallbacks.ontouchmove;
    document.ontouchend = savedCallbacks.ontouchend;
    setSavedCallbacks({
      onmousemove: null,
      onmouseup: null,
      ontouchmove: null,
      ontouchend: null,
    });
  }, [savedCallbacks.onmousemove, savedCallbacks.onmouseup, savedCallbacks.ontouchend, savedCallbacks.ontouchmove]);

  const makeHandleMove = (controlPointIdx: number) => (ev: MouseOrTouchEvent) => {
    if (!canvasRef.current)
      throw new Error("Handle clicked before getting canvas reference.");

    let pageY;
    if ("targetTouches" in ev) {
      pageY = ev.targetTouches.item(0)?.pageY;
      if (pageY === undefined) return;
    } else {
      pageY = ev.pageY;
    }

    const rect = canvasRef.current.getBoundingClientRect();
    const relativeYPos = pageY - rect.y;
    let newLightness = 1 - (relativeYPos / rect.height);
    if (newLightness > 1.0) newLightness = 1.0;
    if (newLightness < 0.0) newLightness = 0.0;
    const newControlPoint = {
      color: values[controlPointIdx].color,
      lightness: newLightness,
    };
    const newValues = values
      .toSpliced(controlPointIdx, 1, newControlPoint);
      // .toSorted((a, b) => a.lightness - b.lightness);

    onChange(newValues);
  };

  const makeHandleStart = (controlPointIdx: number, inStackIdx: number) => (ev: MouseOrTouchEvent) => {

    setStackingOrder(prev => {
      const newOrder = [...prev];
      newOrder.splice(inStackIdx, 1);
      newOrder.push(prev[inStackIdx]);
      return newOrder;
    })

    setSavedCallbacks({
      onmousemove: document.onmousemove,
      onmouseup: document.onmouseup,
      ontouchmove: document.ontouchmove,
      ontouchend: document.ontouchend,
    });
    const handleMove = makeHandleMove(controlPointIdx);
    handleMove(ev);
    document.onmousemove = handleMove;
    document.onmouseup = handleEnd;
    document.ontouchmove = handleMove;
    document.ontouchend = handleEnd;
  };

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    const w = ctx.canvas.width;
    const h = ctx.canvas.height;

    const gradient = ctx.createLinearGradient(0, h, 0, 0);
    for (const controlPoint of values) {
      gradient.addColorStop(controlPoint.lightness, controlPoint.color);
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
  }, [values]);

  return (
    <div
      className={`
        nodrag cursor-default w-full h-48 border border-neutral-700 rounded-md
        bg-neutral-900 relative ${className}
      `}
    >
      {stackingOrder.map((i, inStackIdx) => (
        <div
          key={i}
          style={{ translate: `0 ${(1.0 - values[i].lightness)*9.375}rem` }}
          className={`
            absolute flex flex-row gap-1 w-full p-1 pointer-events-none
          `}
        >
          <div
            className="h-full flex items-center my-auto shrink"
          >
            <div
              className={`
                w-4 bg-neutral-100 border border-neutral-700 my-auto h-1
              `}
            />
          </div>
          <div
            className={`
              border border-neutral-700 bg-neutral-800 rounded-md flex
              flex-row gap-0.5 p-1 grow min-w-0 pointer-events-auto
            `}
          >
            <div
              className={`
                nodrag
                ${dragging ? "cursor-grabbing" : "cursor-grab"}
              `}
              onMouseDown={makeHandleStart(i, inStackIdx)}
              onTouchStart={makeHandleStart(i, inStackIdx)}
            > 
              <Image
                className="h-full aspect-square w-12 select-none pointer-events-none"
                src="drag_indicator.svg"
                alt=""
                width={5}
                height={5}
              />
            </div>
            <div className="grow min-w-0 flex flex-row gap-1">
              <HexColorInput
                className={`
                  min-w-0 grow border border-neutral-700 rounded-md py-0.5
                  px-1 focus:border-neutral-400 outline-0 transition-colors
                `}
                color={values[i].color}
                onChange={(newColor) => {
                  onChange(values.toSpliced(i, 1, { color: newColor, lightness: values[i].lightness }));
                }}
              />
              <PopoverColorPicker
                className="w-16"
                color={values[i].color}
                onChange={(newColor) => {
                  onChange(values.toSpliced(i, 1, { color: newColor, lightness: values[i].lightness }));
                }}
              />
            </div>
            <button
              className={`
                leading-none text-lg cursor-pointer hover:bg-neutral-700
                rounded-md px-0.5
              `}
              onClick={() => {
                setStackingOrder(prev => {
                  return prev
                    .toSpliced(inStackIdx, 1)
                    .map(elem => elem > i ? elem - 1 : elem);
                })
                onChange(values.toSpliced(i, 1));
              }}
            >
              <Image
                className="h-full aspect-square w-12 select-none pointer-events-none"
                src="close.svg"
                alt=""
                width={5}
                height={5}
              />
            </button>
          </div>
        </div>
      ))}
      <div
        className="py-5 h-full z-20 w-4 mx-1"
      >
        <canvas
          className="bg-red-500 h-full w-3 mx-auto cursor-crosshair"
          width={1}
          height={150*4}
          ref={canvasRef}
          onClick={(ev) => {
            if (!canvasRef.current)
              throw new Error("Handle clicked before getting canvas reference.");

            const rect = canvasRef.current.getBoundingClientRect();
            const relativeYPos = ev.pageY - rect.y;
            const lightness = 1 - (relativeYPos / rect.height);
            if (lightness > 1.0 || lightness < 0.0)
              throw new Error("Click in canvas outside the canvas?");
            const newValues = [...values]
            newValues.push({
              color: getColorAtLightness(values, lightness) ?? "#000000",
              lightness,
            });
            setStackingOrder(prev => [...prev, prev.length]);
            // newValues.sort((a, b) => a.lightness - b.lightness);
            onChange(newValues)
          }}
        />
      </div>
    </div>
  );
}
