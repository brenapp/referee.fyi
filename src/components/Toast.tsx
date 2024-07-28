import showToast from "react-hot-toast";
import { Info, Warning } from "./Warning";
import { ErrorToast } from "./ErrorToast";

export type ToastType = "info" | "warn" | "error";
export type ToastArguments = {
  type: ToastType;
  message: string;
  context?: string;
};

export function toast({ type, ...options }: ToastArguments) {
  switch (type) {
    case "info": {
      showToast.custom(() => <Info message={options.message} />, {
        position: "bottom-right",
      });
      break;
    }
    case "warn": {
      showToast.custom(() => <Warning message={options.message} />, {
        position: "bottom-right",
      });
      break;
    }
    case "error": {
      showToast.custom(() => <ErrorToast {...options} />, {
        position: "bottom-right",
      });
      break;
    }
  }
}
