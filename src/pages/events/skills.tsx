import { useCurrentEvent } from "~utils/hooks/state";
import { ShareProvider } from "./home";
import { useEffect, useState } from "react";
import { useAddEventVisited } from "~utils/hooks/history";
import { Button } from "~components/Button";
import { FlagIcon } from "@heroicons/react/20/solid";
import { EventNewIncidentDialog } from "./dialogs/new";
import { Tabs } from "~components/Tabs";
import { EventManageTab } from "./home/manage";
import { Spinner } from "~components/Spinner";
import { EventData } from "robotevents/out/endpoints/events";
import { useEventSkills, useEventTeams } from "~utils/hooks/robotevents";
import AutoSizer from "react-virtualized-auto-sizer";
import { FixedSizeList as List } from "react-window";
import { Link } from "react-router-dom";

type TeamSkillsTabProps = {
  event: EventData;
};

const TeamSkillsTab: React.FC<TeamSkillsTabProps> = ({ event }) => {
  const { data: teams, isLoading: isLoadingTeams } = useEventTeams(event);
  const { data: skills, isLoading: isLoadingSkills } = useEventSkills(event);

  const isLoading = isLoadingTeams || isLoadingSkills;

  console.log(skills);

  return (
    <section className="flex-1">
      <Spinner show={isLoading} />
      <AutoSizer>
        {(size) => (
          <List
            width={size.width}
            height={size.height}
            itemCount={teams?.length ?? 0}
            itemSize={64}
          >
            {({ index, style }) => {
              const team = teams?.[index];

              if (!team) {
                return <div style={style} key={index}></div>;
              }

              return (
                <div style={style} key={team.id}>
                  <Link
                    to={`/${event.sku}/team/${team.number}`}
                    className="flex items-center gap-4 mt-4 h-12 text-zinc-50"
                  >
                    <div className="flex-1">
                      <p className="text-emerald-400 font-mono">
                        {team.number}
                      </p>
                      <p className="overflow-hidden whitespace-nowrap text-ellipsis max-w-[20ch] lg:max-w-prose">
                        {team.team_name}
                      </p>
                    </div>
                  </Link>
                </div>
              );
            }}
          </List>
        )}
      </AutoSizer>
    </section>
  );
};

export const EventSkillsPage: React.FC = () => {
  const { data: event } = useCurrentEvent();

  const [incidentDialogOpen, setIncidentDialogOpen] = useState(false);
  const { mutateAsync: addEvent, isSuccess } = useAddEventVisited();

  useEffect(() => {
    if (event && !isSuccess) {
      addEvent(event);
    }
  }, [event, isSuccess, addEvent]);

  if (!event) {
    return <Spinner show />;
  }

  return (
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
            Teams: <TeamSkillsTab event={event} />,
            Manage: <EventManageTab event={event} />,
          }}
        </Tabs>
      </section>
    </ShareProvider>
  );
};
