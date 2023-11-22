import clsx from "clsx";

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
      className={clsx(
        props.className,
        "rounded-md bg-zinc-700 aspect-square flex items-center justify-center text-zinc-100",
        "hover:bg-zinc-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-500"
      )}
    >
      {icon}
    </button>
  );
};

export type ButtonProps = BaseButtonProps;

export const Button: React.FC<ButtonProps> = (props) => {
  return (
    <button
      {...props}
      className={clsx(
        props.className,
        "rounded-md bg-zinc-700 text-zinc-100 text-left px-3 py-2",
        "hover:bg-zinc-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-500"
      )}
    />
  );
};
