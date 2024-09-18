import { useCurrentEvent } from "~utils/hooks/state";
import { useEffect, useMemo, useState } from "react";
import { useAddEventVisited } from "~utils/hooks/history";
import { Button } from "~components/Button";
import { CodeBracketIcon, FlagIcon, PlayIcon } from "@heroicons/react/20/solid";
import { EventNewIncidentDialog } from "./dialogs/new";
import { Tabs } from "~components/Tabs";
import { EventManageTab } from "./home/manage";
import { Spinner } from "~components/Spinner";
import { EventData } from "robotevents";
import { useEventSkills, useEventTeams } from "~utils/hooks/robotevents";
import { Link } from "react-router-dom";
import { Skill } from "robotevents";

import { UserGroupIcon as TeamsIconOutline } from "@heroicons/react/24/outline";
import { UserGroupIcon as TeamsIconSolid } from "@heroicons/react/24/solid";

import { Cog8ToothIcon as ManageIconOutline } from "@heroicons/react/24/outline";
import { Cog8ToothIcon as ManageIconSolid } from "@heroicons/react/24/solid";
import { VirtualizedList } from "~components/VirtualizedList";

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
      if (!skill.team) continue;
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
      <section className="contents">
        <Spinner show={isLoading} />
        <VirtualizedList
          className="flex-1"
          data={teams}
          options={{ estimateSize: () => 64 }}
          listClassName="mb-12"
        >
          {(team) => {
            if (!team) {
              return null;
            }

            const programming = skillsByTeam[team.number]?.find(
              (skill) => skill.type === "programming"
            );

            const driver = skillsByTeam[team.number]?.find(
              (skill) => skill.type === "driver"
            );

            return (
              <Link
                to={`/${event.sku}/team/${team.number}`}
                className="flex items-center gap-4 mt-4 h-12 text-zinc-50"
              >
                <div className="flex-1">
                  <p className="text-emerald-400 font-mono">{team.number}</p>
                  <p className="overflow-hidden whitespace-nowrap text-ellipsis max-w-[20ch] lg:max-w-prose">
                    {team.team_name}
                  </p>
                </div>
                <p className="h-full pl-2 flex items-center">
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
            );
          }}
        </VirtualizedList>
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
    <section className="mt-4 flex flex-col">
      <Button
        onClick={() => setIncidentDialogOpen(true)}
        mode="primary"
        className="mb-4"
      >
        <FlagIcon height={20} className="inline mr-2 " />
        New Entry
      </Button>
      <EventNewIncidentDialog
        open={incidentDialogOpen}
        setOpen={setIncidentDialogOpen}
      />
      <Tabs
        className="flex-1"
        tablistClassName="absolute bottom-0 right-0 left-0 z-10 p-0 bg-zinc-900"
      >
        {[
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
            content: <TeamSkillsTab event={event} />,
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
  );
};

export default EventSkillsPage;
