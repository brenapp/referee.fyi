import { ExclamationCircleIcon } from "@heroicons/react/20/solid";
import { twMerge } from "tailwind-merge";
import { HTMLProps } from "~utils/types";

export type WarningProps = {
  message: string;
} & HTMLProps<HTMLDivElement>;

export const Warning: React.FC<WarningProps> = ({ message, ...props }) => {
  return (
    <p
      {...props}
      className={twMerge(
        "bg-yellow-300 text-yellow-950 p-2 rounded-md flex items-center gap-2",
        props.className
      )}
    >
      <ExclamationCircleIcon height={20} />
      {message}
    </p>
  );
};

export type ErrorProps = {
  message: string;
} & HTMLProps<HTMLDivElement>;

export const Error: React.FC<ErrorProps> = ({ message, ...props }) => {
  return (
    <p
      {...props}
      className={twMerge(
        "bg-red-300 text-red-950 p-2 rounded-md flex items-center gap-2",
        props.className
      )}
    >
      <ExclamationCircleIcon height={20} />
      {message}
    </p>
  );
};
