import {
	CheckCircleIcon,
	ExclamationCircleIcon,
} from "@heroicons/react/20/solid";
import type { ReactNode } from "react";
import { twMerge } from "tailwind-merge";

export type SuccessProps = {
	message: ReactNode;
	children?: ReactNode;
} & React.HTMLProps<HTMLDivElement>;

export const Success: React.FC<SuccessProps> = ({
	message,
	children,
	...props
}) => {
	return (
		<section
			{...props}
			className={twMerge(
				"bg-emerald-300 text-emerald-950 p-2 rounded-md",
				props.className,
			)}
		>
			<header className="flex items-center gap-2">
				<CheckCircleIcon height={20} />
				{message}
			</header>
			{children}
		</section>
	);
};

export type InfoProps = {
	message: ReactNode;
	children?: ReactNode;
} & React.HTMLProps<HTMLDivElement>;

export const Info: React.FC<InfoProps> = ({ message, children, ...props }) => {
	return (
		<section
			{...props}
			className={twMerge(
				"bg-zinc-900 text-zinc-300 p-2 rounded-md",
				props.className,
			)}
		>
			<header className="flex items-center gap-2">
				<CheckCircleIcon height={20} />
				{message}
			</header>
			{children}
		</section>
	);
};

export type WarningProps = {
	message: ReactNode;
	children?: ReactNode;
} & React.HTMLProps<HTMLDivElement>;

export const Warning: React.FC<WarningProps> = ({
	message,
	children,
	...props
}) => {
	return (
		<section
			{...props}
			className={twMerge(
				"bg-yellow-300 text-yellow-950 p-2 rounded-md",
				props.className,
			)}
		>
			<header className="flex items-center gap-2">
				<ExclamationCircleIcon height={20} />
				{message}
			</header>
			{children}
		</section>
	);
};

export type ErrorProps = {
	message: ReactNode;
	children?: ReactNode;
} & React.HTMLProps<HTMLDivElement>;

export const Error: React.FC<ErrorProps> = ({
	message,
	children,
	...props
}) => {
	return (
		<section
			{...props}
			className={twMerge(
				"bg-red-300 text-red-950 p-2 rounded-md",
				props.className,
			)}
		>
			<header className="flex items-center gap-2">
				<ExclamationCircleIcon height={20} />
				{message}
			</header>
			{children}
		</section>
	);
};
