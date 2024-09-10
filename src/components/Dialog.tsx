import { twMerge } from "tailwind-merge";
import { IconButton } from "./Button";
import { XMarkIcon } from "@heroicons/react/20/solid";
import { useEffect, useRef } from "react";

export type DialogMode = "modal" | "nonmodal";

export type DialogCustomHeaderProps = {
  children?: React.ReactNode;
};

export const DialogCustomHeader: React.FC<DialogCustomHeaderProps> = ({
  children,
}) => {
  return (
    <nav className="h-16 flex p-2 gap-2 items-center max-w-full">
      {children}
    </nav>
  );
};

export type DialogCloseButtonProps = {
  onClose: () => void;
};

export const DialogCloseButton: React.FC<DialogCloseButtonProps> = ({
  onClose,
}) => {
  return (
    <IconButton
      icon={<XMarkIcon height={24} />}
      onClick={onClose}
      className="bg-transparent"
      aria-label="Close dialog"
      autoFocus
    />
  );
};

export type DialogHeaderProps = {
  title: string;
  onClose: () => void;
};

export const DialogHeader: React.FC<DialogHeaderProps> = ({
  title,
  onClose,
}) => {
  return (
    <DialogCustomHeader>
      <DialogCloseButton onClose={onClose} />
      <h1 className="text-xl text-white">{title}</h1>
    </DialogCustomHeader>
  );
};

export type DialogBodyProps = React.HTMLProps<HTMLDivElement>;

export const DialogBody: React.FC<DialogBodyProps> = ({
  children,
  ...props
}) => {
  return (
    <div
      {...props}
      className={twMerge(
        "flex-1 overflow-y-auto overflow-x-clip max-w-full",
        props.className
      )}
    >
      {children}
    </div>
  );
};

export type DialogProps = {
  open: boolean;
  onClose: () => void;
  mode: DialogMode;
} & Omit<React.HTMLProps<HTMLDialogElement>, "ref">;

export const Dialog: React.FC<DialogProps> = ({
  open,
  mode,
  children,
  onClose,
  ...props
}) => {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (open) {
      switch (mode) {
        case "modal":
          ref.current?.showModal();
          break;
        case "nonmodal":
          ref.current?.show();
          break;
      }
    } else {
      ref.current?.close();
    }
  }, [open, mode]);

  if (!open) {
    return null;
  }

  return (
    <dialog
      onPointerDown={(e) => e.stopPropagation()}
      {...props}
      ref={ref}
      onClose={onClose}
      className={twMerge(
        "bg-zinc-900 flex-col p-2 gap-2 z-50 w-svw h-svh max-w-3xl max-h-[1152px] overscroll-none text-zinc-100 rounded-md m-auto",
        props.className,
        open ? "flex" : ""
      )}
    >
      {children}
    </dialog>
  );
};
