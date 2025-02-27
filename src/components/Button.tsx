import { twMerge } from "tailwind-merge";
import { Link, LinkProps } from "react-router-dom";
import { useCallback, useId, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Dialog } from "./Dialog";

export type ButtonMode =
  | "normal"
  | "primary"
  | "dangerous"
  | "transparent"
  | "none";

type BaseButtonProps = React.DetailedHTMLProps<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  HTMLButtonElement
>;

export type IconButtonProps = BaseButtonProps & {
  icon: React.ReactNode;
};

export const IconButton: React.FC<IconButtonProps> = ({ icon, ...props }) => {
  return (
    <button
      {...props}
      className={twMerge(
        "rounded-md bg-zinc-700 aspect-square flex items-center justify-center text-zinc-100",
        "active:bg-zinc-600 focus disabled:bg-zinc-300 disabled:cursor-not-allowed",
        props.className
      )}
    >
      {icon}
    </button>
  );
};

const ButtonClasses: { [K in ButtonMode]: string } = {
  none: "",
  transparent: "w-full bg-transparent",
  normal: "w-full text-center active:bg-zinc-800",
  primary: "w-full text-center bg-emerald-600 active:bg-emerald-700",
  dangerous: "w-full text-center bg-red-500 active:bg-red-700",
};

export type ButtonProps = BaseButtonProps & {
  mode?: ButtonMode;
};

export const Button: React.FC<ButtonProps> = ({
  mode = "normal",
  ...props
}) => {
  return (
    <button
      {...props}
      className={twMerge(
        "rounded-md bg-zinc-700 text-zinc-100 text-left px-3 py-2",
        " disabled:bg-zinc-300 disabled:cursor-not-allowed",
        ButtonClasses[mode],
        props.className
      )}
    />
  );
};

export type LinkButtonProps = LinkProps &
  React.RefAttributes<HTMLAnchorElement>;

export const LinkButton: React.FC<LinkButtonProps> = (props) => {
  return (
    <Link
      {...props}
      className={twMerge(
        "inline-block rounded-md bg-zinc-700 text-zinc-100 text-left px-3 py-2",
        "active:bg-zinc-600 disabled:bg-zinc-300 disabled:cursor-not-allowed",
        props.className
      )}
    />
  );
};

export type MenuButtonProps = ButtonProps & {
  menu: React.ReactNode;
};
export const MenuButton: React.FC<MenuButtonProps> = ({ menu, ...props }) => {
  const id = useId();
  const [show, setShow] = useState(false);

  const ref = useRef<HTMLDialogElement>(null);

  const onButtonClick = useCallback(() => {
    setShow((s) => !s);
  }, []);

  const onDialogPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDialogElement>) => {
      e.stopPropagation();
      if (e.currentTarget === e.target) {
        setShow(false);
      }
    },
    []
  );

  const onDialogPointerUp = useCallback(() => {
    setShow(false);
  }, []);

  return (
    <>
      <AnimatePresence>
        {show ? (
          <Dialog
            ref={ref}
            popover="auto"
            aria-modal="true"
            mode="modal"
            id={id}
            open={show}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.05 }}
            className="fixed w-screen max-w-[unset] bottom-0 left-0 right-0 p-4 rounded-t-md bg-zinc-900 text-zinc-100 z-50 rounded-b-none mb-0"
            style={{ maxHeight: "unset", height: "max-content" }}
            onClose={() => setShow(false)}
            onPointerDown={onDialogPointerDown}
            onPointerUp={onDialogPointerUp}
          >
            {menu}
          </Dialog>
        ) : null}
      </AnimatePresence>
      <Button
        {...props}
        aria-haspopup="menu"
        aria-controls={id}
        popoverTarget={id}
        onClick={onButtonClick}
      />
    </>
  );
};
