import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { tanstackRouterBrowserTracingIntegration } from "@sentry/react";
import { initIncidentStore } from "~utils/data/incident";
import { queryClient } from "~utils/data/query";
import { registerSW } from "virtual:pwa-register";
import { initHistoryStore } from "~utils/hooks/history";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { ErrorBoundary } from "~components/ErrorBoundary";
import { Spinner } from "~components/Spinner";
import { client as sentry } from "~utils/sentry";

import "~utils/sentry";
import "./index.css";

import { routeTree } from "./routeTree.gen";

const router = createRouter({
  routeTree,
  defaultPendingComponent: () => <Spinner show />,
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
