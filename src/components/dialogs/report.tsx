import { useEffect, useState } from "react";
import { Button } from "~components/Button";
import { ClickToCopy } from "~components/ClickToCopy";
import { Dialog, DialogBody, DialogHeader } from "~components/Dialog";
import { Input, TextArea } from "~components/Input";
import { Spinner } from "~components/Spinner";
import { Error } from "~components/Warning";
import { useReportIssue } from "~utils/hooks/report";

export type ReportIssueDialogProps = {
  open: boolean;
  setOpen: (value: boolean) => void;
};

export const ReportIssueDialog: React.FC<ReportIssueDialogProps> = ({
  open,
  setOpen,
}) => {
  const [email, setEmail] = useState("");
  const [comment, setComment] = useState("");

  const {
    mutate: reportIssue,
    data: response,
    error,
    isPending,
    isSuccess,
    isError,
    reset,
  } = useReportIssue({ email, comment });

  useEffect(() => {
    if (!open) {
      reset();
      setComment("");
    }
  }, [reset, open]);

  return (
    <Dialog mode="modal" open={open} onClose={() => setOpen(false)}>
      <DialogHeader
        onClose={() => setOpen(false)}
        title="Report Issues with Referee FYI"
      />
      <DialogBody className="px-2">
        <p>
          Please give a brief description of what went wrong. If you provide an
          email, we may reach out to clarify or to notify you of resolution.
          Information about your device and your session will be included with
          your report.
        </p>
        <label>
          <h2 className="font-bold mt-4">Email</h2>
          <Input
            className="w-full mt-2"
            value={email}
            onChange={(e) => setEmail(e.currentTarget.value)}
          />
        </label>
        <label>
          <h2 className="font-bold mt-4">Comment</h2>
          <TextArea
            className="w-full mt-2"
            value={comment}
            onChange={(e) => setComment(e.currentTarget.value)}
          />
        </label>
        <Button mode="primary" className="mt-4" onClick={() => reportIssue()}>
          Report Issue
        </Button>
        <Spinner show={isPending} />
        {isSuccess ? (
          <section className="mt-4">
            <p className="mt-2">
              Your report has been successfully submitted. Please reference this
              Correlation ID when communicating with the developers about this
              issue.
            </p>
            <ClickToCopy
              className="mt-2"
              message={response?.correlation ?? ""}
            />
          </section>
        ) : null}
        {isError ? (
          <Error message={`Could Not Submit Report! ${error.message}`} />
        ) : null}
      </DialogBody>
    </Dialog>
  );
};
