import { Error } from "./Warning";
import { IconButton } from "./Button";
import { BugAntIcon } from "@heroicons/react/20/solid";
import { ReportIssueDialog } from "./dialogs/report";
import { useState } from "react";
import { ToastArguments } from "./Toast";

export const ErrorToast: React.FC<Omit<ToastArguments, "type">> = ({
  message,
}) => {
  const [open, setOpen] = useState(false);

  return (
    <section className="flex gap-2 items-center">
      <Error message={message} />
      <ReportIssueDialog open={open} setOpen={setOpen} comment={message} />
      <IconButton
        icon={<BugAntIcon height={20} />}
        className="aspect-square h-10 w-10 text-red-950 bg-red-300"
        onClick={() => setOpen(true)}
      />
    </section>
  );
};
