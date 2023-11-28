import { twMerge } from "tailwind-merge";
import { HTMLProps } from "../utils/types";

export type InputBaseProps = HTMLProps<HTMLInputElement>;

export type InputProps = InputBaseProps & {};

export const Input: React.FC<InputProps> = (props) => {
  return (
    <input
      {...props}
      className={twMerge(
        "rounded-md bg-zinc-700 text-zinc-100 text-left px-3 py-2",
        "hover:bg-zinc-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-500",
        props.className
      )}
    />
  );
};

export type SelectBaseProps = React.DetailedHTMLProps<
  React.InputHTMLAttributes<HTMLSelectElement>,
  HTMLSelectElement
>;

export type SelectProps = SelectBaseProps & {};

export const Select: React.FC<SelectBaseProps> = ({ children, ...props }) => {
  return (
    <select
      {...props}
      className={twMerge(
        "rounded-md bg-zinc-700 text-zinc-100 text-left px-3 py-2",
        "hover:bg-zinc-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-500",
        props.className
      )}
    >
      {children}
    </select>
  );
};
