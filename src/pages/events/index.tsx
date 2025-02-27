import { Navigate, Route, Routes } from "react-router-dom";
import { EventDivisionPickerPage } from "./division";
import { EventHome } from "./home";
import { EventSkillsPage } from "./skills";
import { EventSummaryPage } from "./summary";
import { EventTeamsPage } from "./team";
import { EventDevTools } from "./devtools";
import { EventDeletedIncidentsPage } from "./deleted";

import { useCurrentEvent } from "~utils/hooks/state";

const EventPage: React.FC = () => {
  const {
    data: currentEvent,
    isPending: isLoadingCurrentEvent,
    isError: isErrorCurrentEvent,
  } = useCurrentEvent();

  const invalidSKU =
    !isLoadingCurrentEvent && (isErrorCurrentEvent || !currentEvent);

  if (invalidSKU) {
    return <Navigate to="/" replace />;
  }

  return (
    <Routes>
      <Route path="/">
        <Route index path="/" element={<EventDivisionPickerPage />} />
        <Route path="/skills/" element={<EventSkillsPage />} />
        <Route path="/summary/" element={<EventSummaryPage />} />
        <Route path="/deleted/" element={<EventDeletedIncidentsPage />} />
        <Route path="/team/:number" element={<EventTeamsPage />} />
        {import.meta.env.DEV ? (
          <Route path="/devtools" element={<EventDevTools />} />
        ) : null}
        <Route path="/:division" element={<EventHome />} />
      </Route>
    </Routes>
  );
};

export default EventPage;
