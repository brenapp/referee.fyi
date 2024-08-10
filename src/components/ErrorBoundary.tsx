import {
  ErrorBoundary as SentryErrorBoundary,
  ErrorBoundaryProps,
  FallbackRender,
} from "@sentry/react";
import { ReportIssueDialog } from "./dialogs/report";
import { useCallback } from "react";
import { clearCache } from "~utils/sentry";

const ErrorReportIssueDialog: FallbackRender = (props) => {
  console.log(props);
  const setOpen = useCallback(
    (value: boolean) => {
      if (value) return;

      props.resetError();

      if (navigator.onLine) {
        clearCache();
      } else {
        window.location.reload();
      }
    },
    [props]
  );
  return (
    <ReportIssueDialog
      open={true}
      setOpen={setOpen}
      context={JSON.stringify(props)}
    />
  );
};

export const ErrorBoundary: React.FC<ErrorBoundaryProps> = (props) => (
  <SentryErrorBoundary
    fallback={(props) => <ErrorReportIssueDialog {...props} />}
  >
    {props.children}
  </SentryErrorBoundary>
);
