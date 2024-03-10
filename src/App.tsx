import "./App.css";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AppShell } from "./pages/shell";
import { EventPage } from "./pages/events/home";
import { EventTeamsPage } from "./pages/events/team";
import { EventDivisionPickerPage } from "./pages/events/division";
import { HomePage } from "./pages/home";
import { EventJoinPage } from "./pages/events/join";
import { EventSkillsPage } from "./pages/events/skills";
import { EventSummaryPage } from "./pages/events/summary";
import { SettingsPage } from "./pages/settings";

function App() {
  return (
    <BrowserRouter basename="/">
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/:sku">
            <Route index path="/:sku" element={<EventDivisionPickerPage />} />
            <Route path="/:sku/skills/" element={<EventSkillsPage />} />
            <Route path="/:sku/summary/" element={<EventSummaryPage />} />
            <Route path="/:sku/:division" element={<EventPage />} />
            <Route path="/:sku/join" element={<EventJoinPage />} />
            <Route path="/:sku/team/:number" element={<EventTeamsPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
