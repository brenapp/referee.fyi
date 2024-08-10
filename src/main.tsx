import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { initIncidentStore } from "./utils/data/incident";
import { queryClient } from "~utils/data/query";
import { registerSW } from "virtual:pwa-register";
import { initHistoryStore } from "~utils/hooks/history";
import { QueryClientProvider } from "@tanstack/react-query";

// Register Sentry
import "~utils/sentry";

registerSW({ immediate: true });

initIncidentStore();
initHistoryStore();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);
