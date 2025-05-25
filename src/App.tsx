import React from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AppShell } from "./routes/shell";
import { Spinner } from "~components/Spinner";

import "./App.css";

const HomePage = React.lazy(() => import("./routes/home"));
const SettingsPage = React.lazy(() => import("./routes/settings"));
const EventPage = React.lazy(() => import("./routes/events"));
const PrivacyPage = React.lazy(() => import("./routes/privacy"));

function App() {
  return (
    <BrowserRouter basename="/">
      <Routes>
        <Route element={<AppShell />}>
          <Route
            path="/"
            element={
              <React.Suspense fallback={<Spinner show />}>
                <HomePage />
              </React.Suspense>
            }
          />
          <Route
            path="/settings"
            element={
              <React.Suspense fallback={<Spinner show />}>
                <SettingsPage />
              </React.Suspense>
            }
          />
          <Route
            path="/privacy"
            element={
              <React.Suspense fallback={<Spinner show />}>
                <PrivacyPage />
              </React.Suspense>
            }
          />
          <Route
            path="/:sku/*"
            element={
              <React.Suspense fallback={<Spinner show />}>
                <EventPage />
              </React.Suspense>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
