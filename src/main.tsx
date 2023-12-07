import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { QueryClientProvider } from "react-query";
import { initIncidentStore } from "./utils/data/incident";
import { queryClient } from "~utils/data/query";
import { registerSW } from "virtual:pwa-register";

registerSW({ immediate: true });

initIncidentStore();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);
