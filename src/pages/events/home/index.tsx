import { Tabs } from "~components/Tabs";
import { Button } from "~components/Button";
import { FlagIcon } from "@heroicons/react/20/solid";
import { useCurrentEvent } from "~hooks/state";
import { useEffect, useState } from "react";
import { EventNewIncidentDialog } from "../dialogs/new";
import { useAddEventVisited } from "~utils/hooks/history";
import { EventMatchesTab } from "./matches";
import { EventTeamsTab } from "./teams";
import { EventManageTab } from "./manage";

export const EventHome: React.FC = () => {
  const { data: event } = useCurrentEvent();
  const [incidentDialogOpen, setIncidentDialogOpen] = useState(false);
  const { mutateAsync: addEvent, isSuccess } = useAddEventVisited();

  useEffect(() => {
    if (event && !isSuccess) {
      addEvent(event);
    }
  }, [event, isSuccess, addEvent]);

  return event ? (
    <section className="mt-4 flex flex-col">
      <Button onClick={() => setIncidentDialogOpen(true)} mode="primary">
        <FlagIcon height={20} className="inline mr-2 " />
        New Entry
      </Button>
      <EventNewIncidentDialog
        open={incidentDialogOpen}
        setOpen={setIncidentDialogOpen}
      />
      <Tabs className="flex-1">
        {{
          Matches: <EventMatchesTab event={event} />,
          Teams: <EventTeamsTab event={event} />,
          Manage: <EventManageTab event={event} />,
        }}
      </Tabs>
    </section>
  ) : null;
};

export default EventHome;
