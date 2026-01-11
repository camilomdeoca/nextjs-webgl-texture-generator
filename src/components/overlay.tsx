import { ReactNode, RefObject } from "react";
import { createPortal } from "react-dom";

type OverlayProps = {
  children: ReactNode,
  relativeTo: RefObject<HTMLElement | null>,
};

export function Overlay({
  children,
  relativeTo,
}: OverlayProps) {
  const overlayPortal = document.getElementById("overlay-portal");

  const rect = relativeTo.current?.getBoundingClientRect();
  const x = rect?.x;
  const y = rect ? rect.y + rect.height : undefined;

  if(!x || !y || !overlayPortal) return;

  return createPortal(
    <div style={{ left: x, top: y }} className="absolute" >
      {children}
    </div>,
    overlayPortal,
  );
}
