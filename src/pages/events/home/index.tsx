import { Tabs } from "~components/Tabs";
import { Button } from "~components/Button";
import { FlagIcon } from "@heroicons/react/20/solid";
import { useCurrentEvent } from "~hooks/state";
import { PropsWithChildren, useEffect, useState } from "react";
import { EventNewIncidentDialog } from "../dialogs/new";
import { useAddEventVisited } from "~utils/hooks/history";
import { EventMatchesTab } from "./matches";
import { EventTeamsTab } from "./teams";
import { EventManageTab } from "./manage";
import {
  ShareContext,
  connection,
  useEventInvitation,
} from "~utils/hooks/share";
import { registerUser, ShareConnection } from "~utils/data/share";

export const ShareProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const { data: event } = useCurrentEvent();
  const { data: invitation } = useEventInvitation(event?.sku);

  useEffect(() => {
    if (event && invitation && invitation.accepted) {
      connection.setup(event.sku);
    }
  }, [event, invitation]);

  return (
    <ShareContext.Provider value={connection}>{children}</ShareContext.Provider>
  );
};

async function register() {
  const { name } = await ShareConnection.getSender();
  registerUser(name);
}

export const EventPage: React.FC = () => {
  const { data: event } = useCurrentEvent();
  const [incidentDialogOpen, setIncidentDialogOpen] = useState(false);
  const { mutateAsync: addEvent, isSuccess } = useAddEventVisited();

  useEffect(() => {
    if (event && !isSuccess) {
      addEvent(event);
    }
  }, [event, isSuccess, addEvent]);

  useEffect(() => {
    register();
  }, []);

  return event ? (
    <ShareProvider>
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
    </ShareProvider>
  ) : null;
};
