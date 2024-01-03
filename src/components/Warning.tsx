import { ExclamationCircleIcon } from "@heroicons/react/20/solid";
import { twMerge } from "tailwind-merge";

export type InfoProps = {
  message: string;
} & React.HTMLProps<HTMLDivElement>;

export const Info: React.FC<InfoProps> = ({ message, ...props }) => {
  return (
    <p
      {...props}
      className={twMerge(
        "bg-zinc-900 text-zinc-300 p-2 rounded-md flex items-center gap-2",
        props.className
      )}
    >
      <ExclamationCircleIcon height={20} />
      {message}
    </p>
  );
};

export type WarningProps = {
  message: string;
} & React.HTMLProps<HTMLDivElement>;

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
} & React.HTMLProps<HTMLDivElement>;

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
