import { useCurrentEvent } from "~hooks/state";
import { useEffect, useState } from "react";
import { EventNewIncidentDialog } from "../dialogs/new";
import { useAddEventVisited } from "~utils/hooks/history";
import { EventMatchesTab } from "./matches";
import { EventTeamsTab } from "./teams";
import { EventManageTab } from "./manage";

import { ClipboardDocumentListIcon as MatchesIconOutline } from "@heroicons/react/24/outline";
import { ClipboardDocumentListIcon as MatchesIconSolid } from "@heroicons/react/24/solid";

import { UserGroupIcon as TeamsIconOutline } from "@heroicons/react/24/outline";
import { UserGroupIcon as TeamsIconSolid } from "@heroicons/react/24/solid";

import { CloudIcon as ManageIconOutline } from "@heroicons/react/24/outline";
import { CloudIcon as ManageIconSolid } from "@heroicons/react/24/solid";
import { Tabs } from "~components/Tabs";
import { Button } from "~components/Button";
import { FlagIcon } from "@heroicons/react/20/solid";

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
      <EventNewIncidentDialog
        open={incidentDialogOpen}
        setOpen={setIncidentDialogOpen}
      />
      <Button
        className="flex items-center gap-2 justify-center mb-4"
        mode="primary"
        onClick={() => setIncidentDialogOpen(true)}
      >
        <FlagIcon height={20} />
        New Entry
      </Button>
      <Tabs
        className="flex-1"
        parts={{
          tablist: {
            className: "absolute bottom-0 right-0 left-0 z-10 p-0 bg-zinc-900",
          },
        }}
      >
        {[
          {
            type: "content",
            id: "matches",
            label: "Matches",
            icon: (active) =>
              active ? (
                <MatchesIconSolid height={24} className="inline" />
              ) : (
                <MatchesIconOutline height={24} className="inline" />
              ),
            content: <EventMatchesTab event={event} />,
          },
          {
            type: "content",
            id: "team",
            label: "Teams",
            icon: (active) =>
              active ? (
                <TeamsIconSolid height={24} className="inline" />
              ) : (
                <TeamsIconOutline height={24} className="inline" />
              ),
            content: <EventTeamsTab event={event} />,
          },
          {
            type: "content",
            id: "manage",
            label: "Manage",
            icon: (active) =>
              active ? (
                <ManageIconSolid height={24} className="inline" />
              ) : (
                <ManageIconOutline height={24} className="inline" />
              ),
            content: <EventManageTab event={event} />,
          },
        ]}
      </Tabs>
    </section>
  ) : null;
};

export default EventHome;
