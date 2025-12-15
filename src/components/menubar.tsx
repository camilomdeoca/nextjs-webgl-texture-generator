import { useState } from "react";

type MenubarButtonParameters = {
  label: string,
  options: { label: string, callback: () => void }[],
};

function MenubarButton({
  label,
  options,
}: MenubarButtonParameters) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        className="button px-3 py-1 focus:bg-neutral-700 rounded-md"
        onMouseDown={() => setIsOpen(prev => !prev)}
      >
        {label}
      </button>
      <div
        className={`
          flex flex-col absolute z-10 bg-neutral-800 rounded-md mt-2
          origin-top-left border border-neutral-700 font-normal transition-opacity
          ${!isOpen && "opacity-0 pointer-events-none"}
        `}
      >
        {options.map(({label, callback}, i) => 
          <button
            key={i}
            className="px-3 py-1 hover:bg-neutral-700"
            onClick={() => {
              setIsOpen(false);
              callback();
            }}
          >
            {label}
          </button>        
        )}
      </div>
      {isOpen && <div onMouseDown={() => setIsOpen(false)} className="fixed inset-0" />}
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
