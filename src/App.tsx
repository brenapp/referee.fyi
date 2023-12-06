import "./App.css";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AppShell } from "./pages";
import { EventPage } from "./pages/events";
import { EventTeamsPage } from "./pages/events/team";
import { EventDivisionPickerPage } from "./pages/events/division";
import { EventMatchPage } from "./pages/events/match";

function App() {
  return (
    <BrowserRouter basename="/">
      <Routes>
        <Route path="/" element={<AppShell />}>
          <Route path="/:sku">
            <Route index path="/:sku" element={<EventDivisionPickerPage />} />
            <Route path="/:sku/:division" element={<EventPage />} />
            <Route path="/:sku/team/:number" element={<EventTeamsPage />} />
            <Route
              path="/:sku/:division/match/:matchId"
              element={<EventMatchPage />}
            />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
