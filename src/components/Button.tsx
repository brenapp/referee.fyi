import { twMerge } from "tailwind-merge";
import { Link, LinkProps } from "react-router-dom";
import { ButtonMode } from "./constants";

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
  [ButtonMode.Normal]: "",
  [ButtonMode.None]: "bg-transparent",
};

export type ButtonProps = BaseButtonProps & {
  mode?: ButtonMode;
};

export const Button: React.FC<ButtonProps> = ({
  mode = ButtonMode.Normal,
  ...props
}) => {
  return (
    <button
      {...props}
      className={twMerge(
        "rounded-md bg-zinc-700 text-zinc-100 text-left px-3 py-2",
        "active:bg-zinc-600 disabled:bg-zinc-300 disabled:cursor-not-allowed",
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
