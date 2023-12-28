import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { QueryClientProvider } from "react-query";
import { initIncidentStore } from "./utils/data/incident.ts";
import { queryClient } from "~utils/data/query";
import { registerSW } from "virtual:pwa-register";
import { initHistoryStore } from "~utils/hooks/history.ts";

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
