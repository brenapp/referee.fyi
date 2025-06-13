import { ChevronDownIcon, ChevronRightIcon } from "@heroicons/react/20/solid";

export const Details: React.FC<React.HTMLProps<HTMLDetailsElement>> = (
  props
) => <details {...props} />;

export const Summary: React.FC<React.HTMLProps<HTMLElement>> = (props) => (
  <summary
    {...props}
    className="flex gap-2 items-center active:bg-zinc-700 max-w-full mt-0 sticky top-0 bg-zinc-900 h-16 z-10"
  >
    {props.open ? (
      <ChevronDownIcon height={16} width={16} className="flex-shrink-0" />
    ) : (
      <ChevronRightIcon height={16} width={16} className="flex-shrink-0" />
    )}
    {props.children}
  </summary>
);
