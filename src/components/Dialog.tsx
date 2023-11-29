import { twMerge } from "tailwind-merge";
import { HTMLProps } from "../utils/types";
import { IconButton } from "./Button";
import { XMarkIcon } from "@heroicons/react/20/solid";
import { useEffect, useRef } from "react";

export type DialogHeaderProps = {
  title: string;
  onClose: () => void;
};

export const DialogHeader: React.FC<DialogHeaderProps> = ({
  title,
  onClose,
}) => {
  return (
    <nav className="h-16 flex p-2 gap-2 items-center max-w-full">
      <IconButton
        icon={<XMarkIcon height={24} />}
        onClick={onClose}
        className="bg-transparent"
        autoFocus
      />
      <h1 className="text-xl text-white">{title}</h1>
    </nav>
  );
};

export type DialogBodyProps = HTMLProps<HTMLDivElement>;

export const DialogBody: React.FC<DialogBodyProps> = ({
  children,
  ...props
}) => {
  return (
    <div
      {...props}
      className={twMerge("flex-1 overflow-y-auto", props.className)}
    >
      {children}
    </div>
  );
};

export enum DialogMode {
  Modal,
  NonModal,
}

export type DialogProps = {
  open: boolean;
  mode: DialogMode;
} & Omit<HTMLProps<HTMLDialogElement>, "ref">;

export const Dialog: React.FC<DialogProps> = ({
  open,
  mode,
  children,
  ...props
}) => {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (open) {
      switch (mode) {
        case DialogMode.Modal:
          ref.current?.showModal();
          break;
        case DialogMode.NonModal:
          ref.current?.show();
          break;
      }
    } else {
      ref.current?.close();
    }
  }, [open]);

  return (
    <dialog
      {...props}
      ref={ref}
      className={twMerge(
        "bg-zinc-900 flex-col p-2 gap-2 z-50 w-screen h-screen",
        props.className,
        open ? "flex" : ""
      )}
    >
      {children}
    </dialog>
  );
};
