import { useCallback } from "react";
import { IconButton } from "./Button";
import { DocumentDuplicateIcon } from "@heroicons/react/24/outline";
import { twMerge } from "tailwind-merge";
import { toast } from "./Toast";

export type ClickToCopyProps = React.HTMLProps<HTMLDivElement> & {
  message: string;
};

export const ClickToCopy: React.FC<ClickToCopyProps> = ({
  message,
  ...props
}) => {
  const onClick = useCallback(() => {
    if (navigator.clipboard && message) {
      navigator.clipboard.writeText(message);
      toast({ type: "info", message: "Copied to clipboard!" });
    }
  }, [message]);

  return (
    <div className="mt-2 flex gap-2 w-full">
      <IconButton
        className="p-3"
        onClick={onClick}
        icon={<DocumentDuplicateIcon height={20} />}
      />
      <div
        {...props}
        className={twMerge(
          "p-3 px-4 text-ellipsis overflow-hidden bg-zinc-700 rounded-md flex-1",
          props.className
        )}
      >
        {message}
      </div>
    </div>
  );
};
