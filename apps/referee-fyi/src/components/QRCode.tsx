import QrCreator from "qr-creator";
import { useEffect, useRef } from "react";
import { twMerge } from "tailwind-merge";

export type QRCodeProps = React.HTMLProps<HTMLDivElement> & {
	config: QrCreator.Config;
};

export const QRCode: React.FC<QRCodeProps> = ({ config, ...props }) => {
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!ref.current) {
			return;
		}

		ref.current.replaceChildren();

		const { width } = ref.current.getBoundingClientRect();

		QrCreator.render({ size: width, ...config }, ref.current);
	}, [config, ref]);

	return (
		<div className={twMerge("bg-white p-4 rounded-md", props.className)}>
			<div
				{...props}
				ref={ref}
				className="flex items-center justify-center aspect-square"
			></div>
		</div>
	);
};
