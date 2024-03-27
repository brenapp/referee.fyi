import { Route, Routes } from "react-router-dom";
import { EventDivisionPickerPage } from "./division";
import { EventHome } from "./home";
import { EventSkillsPage } from "./skills";
import { EventSummaryPage } from "./summary";
import { EventTeamsPage } from "./team";

const EventPage: React.FC = () => {
  return (
    <Routes>
      <Route path="/">
        <Route index path="/" element={<EventDivisionPickerPage />} />
        <Route path="/skills/" element={<EventSkillsPage />} />
        <Route path="/summary/" element={<EventSummaryPage />} />
        <Route path="/:division" element={<EventHome />} />
        <Route path="/team/:number" element={<EventTeamsPage />} />
      </Route>
    </Routes>
  );
};

export default EventPage;
