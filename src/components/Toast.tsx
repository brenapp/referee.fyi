import showToast from "react-hot-toast";
import { Error, Info, Warning } from "./Warning";

export type ToastType = "info" | "warn" | "error";
export type ToastArguments = {
  type: ToastType;
  message: string;
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
      showToast.custom(() => <Error message={options.message} />, {
        position: "bottom-right",
      });
      break;
    }
  }
}
