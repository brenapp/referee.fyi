import { twMerge } from "tailwind-merge";

export type ChipProps = React.HTMLProps<HTMLSpanElement> & {
	children: React.ReactNode;
};

export const Chip: React.FC<ChipProps> = ({
	children,
	className,
	...props
}) => {
	return (
		<span {...props} className={twMerge("p-1 rounded-md px-2", className)}>
			{children}
		</span>
	);
};

export const ChipGroup: React.FC<React.HTMLProps<HTMLDivElement>> = ({
	children,
	className,
	...props
}) => {
	return (
		<div {...props} className={twMerge("py-2 flex gap-x-2", className)}>
			{children}
		</div>
	);
};
