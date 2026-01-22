import Image from "next/image";
import Button from "./ui/button/button";

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
    <Button
      onClick={callback}
      title={label}
    >
      {imageSrc !== undefined
        ? <Image className="h-6 w-6" src={imageSrc} alt={label} width={10} height={10} />
        : label
      }
    </Button>
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
      <div className="mx-1 flex flex-row gap-1">
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
