import { ArrowPathIcon } from "@heroicons/react/24/outline";
import type React from "react";
import { twMerge } from "tailwind-merge";

export type SpinnerProps = Omit<React.SVGProps<SVGSVGElement>, "ref"> & {
	show?: boolean;
};

export const Spinner: React.FC<SpinnerProps> = ({ show, ...props }) => {
	if (!show) return null;

	return (
		<div className="flex justify-center my-4">
			<ArrowPathIcon
				{...props}
				className={twMerge(
					"animate-spin h-6 w-6 text-zinc-100",
					props.className,
				)}
			/>
		</div>
	);
};
