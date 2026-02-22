import { ChevronDownIcon, ChevronRightIcon } from "@heroicons/react/20/solid";
import { twMerge } from "tailwind-merge";

export const Details: React.FC<React.HTMLProps<HTMLDetailsElement>> = (
	props,
) => <details {...props} className={`group ${props.className}`} />;

export const Summary: React.FC<React.HTMLProps<HTMLElement>> = (props) => (
	<summary
		{...props}
		className={twMerge(
			"flex gap-2 items-center active:bg-zinc-700 max-w-full mt-0 sticky top-0 bg-zinc-900",
			props.className,
		)}
	>
		<span className="group-open:inline hidden mx-4">
			<ChevronDownIcon height={20} width={20} className="flex-shrink-0" />
		</span>
		<span className="group-open:hidden block mx-4">
			<ChevronRightIcon height={20} width={20} className="flex-shrink-0" />
		</span>
		{props.children}
	</summary>
);
