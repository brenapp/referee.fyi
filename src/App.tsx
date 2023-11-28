import "./App.css";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AppShell } from "./pages";
import { EventPage } from "./pages/events";
import { EventTeamsPage } from "./pages/events/team";
import { EventNewIncidentPage } from "./pages/events/new";
import { RulesPage } from "./pages/rules";
import { RulesProgramPage } from "./pages/rules/program";
import { EventDivisionPickerPage } from "./pages/events/division";

function App() {
  return (
    <BrowserRouter basename="/">
      <Routes>
        <Route path="/" element={<AppShell />}>
          <Route path="/rules">
            <Route index path="/rules" element={<RulesPage />} />
            <Route path="/rules/:program" element={<RulesProgramPage />} />
          </Route>
          <Route path="/:sku">
            <Route index path="/:sku" element={<EventDivisionPickerPage />} />
            <Route path="/:sku/:division" element={<EventPage />} />
            <Route path="/:sku/team/:number" element={<EventTeamsPage />} />
            <Route
              path="/:sku/:division/new"
              element={<EventNewIncidentPage />}
            />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
