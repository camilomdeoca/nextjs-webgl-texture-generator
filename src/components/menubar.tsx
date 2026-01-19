import { useRef, useState } from "react";
import { UnmountOnConditionDelayed } from "./ui/unmount-on-condition-delayed";
import { Overlay } from "./ui/overlay";
import Image from "next/image";

type MenubarButtonParameters = {
  label: string,
  options: { iconSrc?: string, label: string, callback: () => void }[],
};

function MenubarButton({
  label,
  options,
}: MenubarButtonParameters) {
  const [isOpen, setIsOpen] = useState(false);
  
  const menubarButtonRef = useRef<HTMLButtonElement | null>(null);

  const hasSomeButtonAnIcon = options.some(option => option.iconSrc !== undefined);

  return (
    <>
      <button
        className="button px-3 py-1 focus:bg-neutral-700 rounded-md"
        onMouseDown={() => setIsOpen(prev => !prev)}
        ref={menubarButtonRef}
      >
        {label}
      </button>
      <UnmountOnConditionDelayed
        showCondition={isOpen}
      >
        <Overlay
          relativeTo={menubarButtonRef}
        >
          <div
            className={`
              flex flex-col absolute z-50 bg-neutral-800 rounded-md mt-2
              border border-neutral-700 font-normal
              whitespace-nowrap shadow-md shadow-black
              ${isOpen
                ? "animate-fade-in-opacity"
                : "animate-fade-out-opacity pointer-events-none"}
            `}
          >
            {options.map(({iconSrc, label, callback}, i) => 
              <button
                key={i}
                className="px-3 py-1 hover:bg-neutral-700 flex flex-row gap-2 w-full"
                onClick={() => {
                  setIsOpen(false);
                  callback();
                }}
              >
                {iconSrc !== undefined
                  ? <div className="w-5 h-5 relative">
                    <Image className="object-contain" fill src={iconSrc} alt="" />
                  </div>
                  : hasSomeButtonAnIcon && <div className="w-5 h-5" />}
                <span className="text-sm font-medium text-neutral-100 grow text-left">
                  {label}
                </span>
              </button>        
            )}
          </div>
          {isOpen && <div onMouseDown={() => setIsOpen(false)} className="fixed inset-0 z-40" />}
        </Overlay>
      </UnmountOnConditionDelayed>
    </>
  );
}

type MenubarParameters = {
  className: string,
  menus: MenubarButtonParameters[],
};

export default function Menubar({
  className,
  menus,
}: MenubarParameters) {
  return (
    <div
      className={className + `
        flex flex-row
        bg-neutral-800 text-sm font-medium p-0.5 relative
        border-b border-neutral-700
      `}
    >
      <div className="mx-1">
        {menus.map(({label, options}, i) => (
          <MenubarButton
            key={i}
            label={label}
            options={options}
          />
        ))}
      </div>
    </div>
  );
}
