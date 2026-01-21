import { ReactNode } from "react";

type ButtonProps = {
  className?: string,
  children?: ReactNode,
  onClick?: () => void,
};

export default function Button({
  className,
  children,
  onClick,
}: ButtonProps) {
  return <div className={className}>
    <button
      className="p-1 hover:bg-neutral-700 rounded-md"
      onClick={onClick}
    >
      {children}
    </button>
  </div>
}
