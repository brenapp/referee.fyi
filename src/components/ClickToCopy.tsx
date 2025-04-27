import { type ReactNode, useCallback } from "react";
import { Button, ButtonProps, IconButton } from "./Button";
import { DocumentDuplicateIcon } from "@heroicons/react/24/outline";
import { toast } from "./Toast";
import { twMerge } from "tailwind-merge";

export type ClickToCopyProps = ButtonProps & {
  message: string;
  prefix?: ReactNode;
};

export const ClickToCopy: React.FC<ClickToCopyProps> = ({
  message,
  prefix,
  ...props
}) => {
  const onClick = useCallback(() => {
    if (navigator.clipboard && message) {
      navigator.clipboard.writeText(message);
      toast({ type: "info", message: "Copied to clipboard!" });
    }
  }, [message]);

  return (
    <Button
      {...props}
      mode="normal"
      className={twMerge(
        "font-mono text-left flex gap-2 items-center mt-2 py-2 px-3 active:bg-zinc-500",
        props.className
      )}
      onClick={onClick}
    >
      <DocumentDuplicateIcon height={20} className="w-5 h-5 flex-shrink-0" />
      {prefix ? <span className="text-zinc-400 text-sm">{prefix}</span> : null}
      <span className="text-ellipsis overflow-hidden text-nowrap whitespace-nowrap">
        {message}
      </span>
    </Button>
  );
};

export type ClickToCopyIconProps = ButtonProps & {
  value: string;
};

export const ClickToCopyIcon: React.FC<ClickToCopyIconProps> = ({
  value,
  ...props
}) => {
  const onClick = useCallback(() => {
    if (navigator.clipboard && value) {
      navigator.clipboard.writeText(value);
      toast({ type: "info", message: "Copied to clipboard!" });
    }
  }, [value]);

  return (
    <IconButton
      {...props}
      className={twMerge(
        "font-mono text-left flex gap-2 items-center mt-2 py-2 px-3 active:bg-zinc-500",
        props.className
      )}
      onClick={onClick}
      icon={
        <DocumentDuplicateIcon height={20} className="w-5 h-5 flex-shrink-0" />
      }
    />
  );
};
