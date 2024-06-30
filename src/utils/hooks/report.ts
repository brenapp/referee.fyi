import { useMutation } from "@tanstack/react-query";
import { IssueReportMetadata, reportIssue } from "~utils/data/report";

export function useReportIssue(
  sku: string | null,
  metadata: IssueReportMetadata
) {
  return useMutation({
    mutationFn() {
      return reportIssue(sku, metadata);
    },
  });
}
