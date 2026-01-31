import { useCallback, useId, useState } from "react";
import { Button, ButtonProps } from "./Button";
import { Dialog, DialogProps } from "./Dialog";

export type MenuPersistence =
  | {
      type: "ephemeral";
    }
  | {
      type: "persistent";
      closer: React.FC<{ close: () => void }>;
    };

export type MenuProps = React.PropsWithChildren<{
  id: string;
  persistence?: MenuPersistence;
  show: boolean;
  setShow: React.Dispatch<React.SetStateAction<boolean>>;
}>;

export const Menu: React.FC<MenuProps> = ({
  id,
  children,
  show,
  setShow,
  persistence = { type: "ephemeral" },
}) => {
  const props: Partial<DialogProps> = {};

  if (persistence.type === "ephemeral") {
    props["onClick"] = () => setShow(false);
  }

  return (
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
      {...props}
    >
      {children}
      {persistence.type === "persistent" && (
        <persistence.closer close={() => setShow(false)} />
      )}
    </Dialog>
  );
};

export type MenuButtonProps = ButtonProps & {
  menu: React.ReactNode;
  menuProps?: Partial<Omit<MenuProps, "id" | "show" | "setShow" | "children">>;
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
      <Menu id={id} show={show} setShow={setShow} {...props.menuProps}>
        {menu}
      </Menu>
      <Button
        {...props}
        aria-haspopup="menu"
        aria-controls={id}
        onClick={onButtonClick}
      />
    </div>
  );
};
