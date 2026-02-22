import showToast from "react-hot-toast";
import { ErrorToast } from "./ErrorToast";
import { Info, Warning } from "./Warning";

export type ToastType = "info" | "warn" | "error";
export type ToastArguments = {
	type: ToastType;
	message: string;
	context?: string;
};

export function toast({ type, ...options }: ToastArguments) {
	switch (type) {
		case "info": {
			showToast.custom(() => <Info message={options.message} role="alert" />, {
				position: "bottom-right",
			});
			break;
		}
		case "warn": {
			showToast.custom(
				() => <Warning message={options.message} role="alert" />,
				{
					position: "bottom-right",
				},
			);
			break;
		}
		case "error": {
			showToast.custom(() => <ErrorToast {...options} role="alert" />, {
				position: "bottom-right",
			});
			break;
		}
	}
}
