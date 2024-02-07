import { useCurrentEvent } from "~utils/hooks/state";
import { ShareProvider } from "./home";
import { useEffect, useMemo, useState } from "react";
import { useAddEventVisited } from "~utils/hooks/history";
import { Button } from "~components/Button";
import { CodeBracketIcon, FlagIcon, PlayIcon } from "@heroicons/react/20/solid";
import { EventNewIncidentDialog } from "./dialogs/new";
import { Tabs } from "~components/Tabs";
import { EventManageTab } from "./home/manage";
import { Spinner } from "~components/Spinner";
import { EventData } from "robotevents/out/endpoints/events";
import { useEventSkills, useEventTeams } from "~utils/hooks/robotevents";
import AutoSizer from "react-virtualized-auto-sizer";
import { FixedSizeList as List } from "react-window";
import { Link } from "react-router-dom";
import { Skill } from "robotevents/out/endpoints/skills";

type TeamSkillsTabProps = {
  event: EventData;
};

const TeamSkillsTab: React.FC<TeamSkillsTabProps> = ({ event }) => {
  const { data: teams, isLoading: isLoadingTeams } = useEventTeams(event);
  const { data: skills, isLoading: isLoadingSkills } = useEventSkills(event);

  const skillsByTeam = useMemo(() => {
    if (!skills) {
      return {};
    }

    const teams: Record<string, Skill[]> = {};

    for (const skill of skills) {
      if (teams[skill.team.name]) {
        teams[skill.team.name].push(skill);
      } else {
        teams[skill.team.name] = [skill];
      }
    }

    return teams;
  }, [skills]);

  const isLoading = isLoadingTeams || isLoadingSkills;

  return (
    <>
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

                const programming = skillsByTeam[team.number]?.find(
                  (skill) => skill.type === "programming"
                );

                const driver = skillsByTeam[team.number]?.find(
                  (skill) => skill.type === "driver"
                );

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
                      <p className="h-full w-32 px-2 flex items-center">
                        <span className="mr-4">
                          <PlayIcon height={20} className="inline" />
                          <span className="font-mono ml-2">
                            {driver?.attempts ?? 0}
                          </span>
                        </span>
                        <span className="">
                          <CodeBracketIcon height={20} className="inline" />
                          <span className="font-mono ml-2">
                            {programming?.attempts ?? 0}
                          </span>
                        </span>
                      </p>
                    </Link>
                  </div>
                );
              }}
            </List>
          )}
        </AutoSizer>
      </section>
    </>
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
