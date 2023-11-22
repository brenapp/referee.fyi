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
      className={clsx(
        "rounded-md bg-zinc-800 aspect-square flex items-center justify-center text-zinc-100",
        "hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-500"
      )}
      {...props}
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
        "rounded-md bg-zinc-800 text-zinc-100 text-left px-3 py-2",
        "hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-500",
        props.className
      )}
    />
  );
};
