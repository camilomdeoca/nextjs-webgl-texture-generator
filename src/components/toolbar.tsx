import Image from "next/image";

type ToolbarButtonParams = {
  label: string,
  imageSrc: string | undefined,
  callback: () => void,
};

function ToolbarButton({
  label,
  imageSrc,
  callback
}: ToolbarButtonParams) {
  return (
    <button
      className="button p-1 hover:bg-neutral-700 rounded-md"
      onMouseDown={callback}
    >
      {imageSrc !== undefined
        ? <Image className="h-6 w-6" src={imageSrc} alt={label} width={10} height={10} />
        : label
      }
    </button>
  );
}

type ToolbarParams = {
  className: string,
  tools: ToolbarButtonParams[],
};

export default function Toolbar({
  className,
  tools,
}: ToolbarParams) {
  return (
    <div
      className={className + `
        flex flex-row
        bg-neutral-800 text-sm font-medium px-3 py-1 relative
        border-b border-neutral-700
      `}
    >
      <div className="mx-1">
        {tools.map(({label, imageSrc, callback}, i) => (
          <ToolbarButton
            key={i}
            label={label}
            imageSrc={imageSrc}
            callback={callback}
          />
        ))}
      </div>
    </div>
  );
}
