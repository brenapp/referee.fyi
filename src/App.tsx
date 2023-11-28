import "./App.css";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AppShell } from "./pages";
import { EventPage } from "./pages/events";
import { EventTeamsPage } from "./pages/events/team";
import { EventNewIncidentPage } from "./pages/events/new";
import { RulesPage } from "./pages/rules";

function App() {
  return (
    <BrowserRouter basename="/">
      <Routes>
        <Route path="/" element={<AppShell />}>
          <Route path="/rules">
            <Route path="/rules" element={<RulesPage />} />
          </Route>
          <Route path="/:sku">
            <Route path="/:sku" element={<EventPage />} />
            <Route path="/:sku/team/:number" element={<EventTeamsPage />} />
            <Route path="/:sku/new" element={<EventNewIncidentPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
