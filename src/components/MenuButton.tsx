import { useCallback, useId, useState } from "react";
import { Button, ButtonProps } from "./Button";
import { Dialog } from "./Dialog";
import { AnimatePresence } from "framer-motion";

export type MenuButtonProps = ButtonProps & {
  menu: React.ReactNode;
};
export const MenuButton: React.FC<MenuButtonProps> = ({ menu, ...props }) => {
  const id = useId();
  const [show, setShow] = useState(false);

  const onButtonClick = useCallback(() => {
    setShow((s) => !s);
  }, []);

  const onDialogPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDialogElement>) => {
      e.stopPropagation();
      if (e.currentTarget === e.target) {
        e.preventDefault();
        setShow(false);
      }
    },
    []
  );

  return (
    <div className="relative">
      <AnimatePresence>
        {show ? (
          <Dialog
            aria-modal="true"
            mode="modal"
            id={id}
            open={show}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.05 }}
            className="fixed md:max-w-full w-screen max-w-[unset] bottom-0 left-0 right-0 p-4 rounded-t-md bg-zinc-900 text-zinc-100 z-50 rounded-b-none mb-0"
            style={{ maxHeight: "unset", height: "max-content" }}
            onClose={() => setShow(false)}
            onPointerDown={onDialogPointerDown}
          >
            {menu}
          </Dialog>
        ) : null}
      </AnimatePresence>
      <Button
        {...props}
        aria-haspopup="menu"
        aria-controls={id}
        onPointerDown={onButtonClick}
      />
    </div>
  );
};
