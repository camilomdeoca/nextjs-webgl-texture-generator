import { ReactNode } from "react";

type ButtonProps = {
  className?: string,
  children?: ReactNode,
  title?: string,
  onClick?: () => void,
};

export default function Button({
  className,
  children,
  title,
  onClick,
}: ButtonProps) {
  return <div className={className}>
    <button
      className="p-1 hover:bg-neutral-700 active:bg-neutral-400 rounded-md w-full cursor-pointer"
      title={title}
      onClick={onClick}
    >
      {children}
    </button>
  </div>
}
