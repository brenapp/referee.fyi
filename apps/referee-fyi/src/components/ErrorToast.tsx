import { Error } from "./Warning";
import { IconButton } from "./Button";
import { BugAntIcon } from "@heroicons/react/20/solid";
import { ReportIssueDialog } from "./dialogs/report";
import { useState } from "react";
import { ToastArguments } from "./Toast";
import { twMerge } from "tailwind-merge";

export type ErrorToastProps = Omit<ToastArguments, "type"> &
  React.HTMLProps<HTMLDivElement>;

export const ErrorToast: React.FC<ErrorToastProps> = ({
  message,
  context,
  ...props
}) => {
  const [open, setOpen] = useState(false);

  return (
    <section
      {...props}
      className={twMerge("flex gap-2 items-center", props.className)}
    >
      <Error message={message + "\n" + context} />
      <ReportIssueDialog
        open={open}
        setOpen={setOpen}
        comment={message}
        context={context}
      />
      <IconButton
        icon={<BugAntIcon height={20} />}
        className="aspect-square h-10 w-10 text-red-950 bg-red-300"
        onClick={() => setOpen(true)}
      />
    </section>
  );
};
