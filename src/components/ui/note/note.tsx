import Image from "next/image";
import { ReactNode } from "react";
  
const bgMap = {
  "red": "bg-red-950 border-red-900",
  "yellow": "bg-yellow-900 border-yellow-700",
  "blue": "bg-slate-900 border-slate-700",
} as const;

type NoteParams = {
  className?: string,
  color?: keyof typeof bgMap,
  icon?: "info" | "warning",
  children?: ReactNode,
};

export default function Note({
  className,
  color = "yellow",
  icon,
  children,
}: NoteParams) {

  return <div className={className}>
    <div className={`${bgMap[color]} w-full h-full rounded-md border-2 p-1 flex flex-row gap-1`}>
      {icon && <div className="relative aspect-square h-full">
        <Image className="object-contain" src={`${icon}.svg`} alt="" fill />
      </div>}
      {children}
    </div>
  </div>;
}
