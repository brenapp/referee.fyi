import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { initIncidentStore } from "./utils/data/incident";
import { CACHE_BUSTER, queryClient, persister } from "~utils/data/query";
import { registerSW } from "virtual:pwa-register";
import { initHistoryStore } from "~utils/hooks/history";

registerSW({ immediate: true });

initIncidentStore();
initHistoryStore();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister, buster: CACHE_BUSTER }}
    >
      <App />
    </PersistQueryClientProvider>
  </React.StrictMode>
);
