import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import {
  captureException,
  tanstackRouterBrowserTracingIntegration,
} from "@sentry/react";
import { initIncidentStore } from "~utils/data/incident";
import { queryClient } from "~utils/data/query";
import { registerSW } from "virtual:pwa-register";
import { initHistoryStore } from "~utils/hooks/history";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import {
  ErrorBoundary,
  ErrorReportIssueDialog,
} from "~components/ErrorBoundary";
import { Spinner } from "~components/Spinner";
import { client as sentry } from "~utils/sentry";

import "~utils/sentry";
import "./index.css";

import { routeTree } from "./routeTree.gen";

const router = createRouter({
  routeTree,
  defaultPendingComponent: () => <Spinner show />,
  defaultErrorComponent: ({ error, reset, info }) => {
    const eventId = captureException(error, { extra: { info } });
    return (
      <ErrorReportIssueDialog
        error={error}
        resetError={reset}
        eventId={eventId}
        componentStack={info?.componentStack ?? ""}
      />
    );
  },
});
sentry?.addIntegration(tanstackRouterBrowserTracingIntegration(router));

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

registerSW({ immediate: true });

initIncidentStore();
initHistoryStore();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <RouterProvider router={router} />
      </ErrorBoundary>
    </QueryClientProvider>
  </React.StrictMode>
);
