import React from "react";
import ReactDOM from "react-dom/client";
import { initIncidentStore } from "~utils/data/incident";
import { queryClient } from "~utils/data/query";
import { registerSW } from "virtual:pwa-register";
import { initHistoryStore } from "~utils/hooks/history";
import { QueryClientProvider } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { ErrorBoundary } from "~components/ErrorBoundary";

import "~utils/sentry";
import "./index.css";

import { routeTree } from "./routeTree.gen";
import { Spinner } from "~components/Spinner";

const router = createRouter({
  routeTree,
  defaultPendingComponent: () => <Spinner show />,
  defaultViewTransition: true,
});

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
