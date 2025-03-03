import { useCallback, useId, useState } from "react";
import { Button, ButtonProps } from "./Button";
import { Dialog } from "./Dialog";

export type MenuButtonProps = ButtonProps & {
  menu: React.ReactNode;
};
export const MenuButton: React.FC<MenuButtonProps> = ({ menu, ...props }) => {
  const id = useId();
  const [show, setShow] = useState(false);

  const onButtonClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.currentTarget.blur();
      setShow((s) => !s);
    },
    []
  );

  return (
    <div className="relative">
      <Dialog
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
        onClick={() => setShow(false)}
      >
        {menu}
      </Dialog>
      <Button
        {...props}
        aria-haspopup="menu"
        aria-controls={id}
        onClick={onButtonClick}
      />
    </div>
  );
};
