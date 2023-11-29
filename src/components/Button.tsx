import { twMerge } from "tailwind-merge";
import { Link, LinkProps } from "react-router-dom";
import { HTMLProps } from "../utils/types";

type BaseButtonProps = HTMLProps<HTMLButtonElement>;

export type IconButtonProps = BaseButtonProps & {
  icon: React.ReactNode;
};

export const IconButton: React.FC<IconButtonProps> = ({ icon, ...props }) => {
  return (
    <button
      {...props}
      className={twMerge(
        "rounded-md bg-zinc-700 aspect-square flex items-center justify-center text-zinc-100",
        "hover:bg-zinc-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-500 disabled:bg-zinc-300 disabled:cursor-not-allowed",
        props.className
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
      className={twMerge(
        "rounded-md bg-zinc-700 text-zinc-100 text-left px-3 py-2",
        "hover:bg-zinc-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-500 disabled:bg-zinc-300 disabled:cursor-not-allowed",
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
        "hover:bg-zinc-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-500 disabled:bg-zinc-300 disabled:cursor-not-allowed",
        props.className
      )}
    />
  );
};
