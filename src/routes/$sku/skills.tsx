import { useCurrentEvent } from "~utils/hooks/state";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAddEventVisited } from "~utils/hooks/history";
import { Button, LinkButton } from "~components/Button";
import { CodeBracketIcon, FlagIcon, PlayIcon } from "@heroicons/react/20/solid";
import { EventNewIncidentDialog } from "~components/dialogs/new";
import { Tabs } from "~components/Tabs";
import { EventManageTab } from "./$division/-tabs/manage";
import { Spinner } from "~components/Spinner";
import { EventData } from "robotevents";
import { useEventSkills, useEventTeams } from "~utils/hooks/robotevents";
import { Skill } from "robotevents";
import { IconLabel, Input } from "~components/Input";

import {
  ArrowRightIcon,
  MagnifyingGlassIcon,
  UserGroupIcon as TeamsIconOutline,
} from "@heroicons/react/24/outline";
import { UserGroupIcon as TeamsIconSolid } from "@heroicons/react/24/solid";

import { Cog8ToothIcon as ManageIconOutline } from "@heroicons/react/24/outline";
import { Cog8ToothIcon as ManageIconSolid } from "@heroicons/react/24/solid";
import { VirtualizedList } from "~components/VirtualizedList";
import { filterTeams } from "~utils/filterteams";
import { MenuButton } from "~components/MenuButton";
import { RichIncident } from "~utils/data/incident";
import { useEventIncidents } from "~utils/hooks/incident";
import { RulesSummary } from "~components/RulesSummary";
import { createFileRoute } from "@tanstack/react-router";

type TeamSkillsTabProps = {
  event: EventData;
};

const TeamSkillsTab: React.FC<TeamSkillsTabProps> = ({ event }) => {
  const { data: incidents } = useEventIncidents(event?.sku);
  const { data: teams, isLoading: isLoadingTeams } = useEventTeams(event);
  const { data: skills, isLoading: isLoadingSkills } = useEventSkills(event);
  const [filter, setFilter] = useState("");

  const [newIncidentDialogOpen, setNewIncidentDialogOpen] = useState(false);
  const [newIncidentDialogInitial, setNewIncidentDialogInitial] = useState<
    Partial<RichIncident>
  >({});

  const openNewIncidentDialog = useCallback(
    (initial: Partial<RichIncident> = {}) => {
      setNewIncidentDialogInitial(initial);
      setTimeout(() => {
        setNewIncidentDialogOpen(true);
      }, 0);
    },
    []
  );

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

  const filteredTeams = useMemo(
    () => (teams ? filterTeams(teams, filter) : []),
    [filter, teams]
  );

  return (
    <>
      <section className="contents mb-12">
        <IconLabel icon={<MagnifyingGlassIcon height={24} />}>
          <Input
            placeholder="Search teams..."
            className="flex-1"
            value={filter}
            onChange={(e) => setFilter(e.currentTarget.value.toUpperCase())}
          />
        </IconLabel>
        <EventNewIncidentDialog
          open={newIncidentDialogOpen}
          setOpen={setNewIncidentDialogOpen}
          initial={newIncidentDialogInitial}
        />
        <Spinner show={isLoading} />
        <VirtualizedList
          className="flex-1"
          data={filteredTeams}
          options={{ estimateSize: () => 64 }}
          parts={{ list: { className: "mb-12" } }}
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
              <MenuButton
                menu={
                  <nav className="mt-2">
                    <div className="flex items-center gap-4 mb-4">
                      <p className="overflow-hidden whitespace-nowrap text-ellipsis max-w-full flex-1">
                        <span className="font-mono text-emerald-400">
                          {team.number}
                        </span>
                        {" • "}
                        <span>{team.team_name}</span>
                      </p>
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
                    </div>
                    <RulesSummary
                      className="break-all"
                      incidents={incidents ?? []}
                      filter={(i) =>
                        i.team == team.number && i.match?.type !== "match"
                      }
                    />
                    <LinkButton
                      to={"/$sku/$team"}
                      params={{ sku: event.sku, team: team.number }}
                      className="w-full mt-4 flex items-center"
                    >
                      <span className="flex-1">Details</span>
                      <ArrowRightIcon
                        height={20}
                        className="text-emerald-400"
                      />
                    </LinkButton>
                    <hr className="mt-4 border-zinc-600" />
                    <Button
                      mode="normal"
                      className="mt-4"
                      onClick={() =>
                        openNewIncidentDialog({
                          team: team.number,
                          outcome: "Inspection",
                        })
                      }
                    >
                      <FlagIcon height={20} className="inline mr-2 " />
                      Inspection
                    </Button>
                    <Button
                      mode="normal"
                      className="mt-4"
                      onClick={() =>
                        openNewIncidentDialog({
                          team: team.number,
                          skills: {
                            type: "skills",
                            skillsType: "driver",
                            attempt: Math.min(3, (driver?.attempts ?? 0) + 1),
                          },
                          outcome: "Minor",
                        })
                      }
                    >
                      <FlagIcon height={20} className="inline mr-2 " />
                      Driver Skills
                    </Button>
                    <Button
                      mode="normal"
                      className="mt-4"
                      onClick={() =>
                        openNewIncidentDialog({
                          team: team.number,
                          skills: {
                            type: "skills",
                            skillsType: "programming",
                            attempt: Math.min(
                              3,
                              (programming?.attempts ?? 0) + 1
                            ),
                          },
                          outcome: "Minor",
                        })
                      }
                    >
                      <FlagIcon height={20} className="inline mr-2 " />
                      Auto Skills
                    </Button>
                  </nav>
                }
                mode="transparent"
                className="flex items-center gap-4 mt-4 h-12 text-zinc-50"
              >
                <div className="flex-1">
                  <p className="text-emerald-400 font-mono">{team.number}</p>
                  <p className="overflow-hidden whitespace-nowrap text-ellipsis max-w-[20ch] lg:max-w-prose">
                    {team.team_name}
                  </p>
                </div>
                <div className="absolute right-0 bg-zinc-800 h-full pl-2 flex items-center">
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
                </div>
              </MenuButton>
            );
          }}
        </VirtualizedList>
      </section>
    </>
  );
};

export const EventSkillsPage: React.FC = () => {
  const { data: event } = useCurrentEvent();

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

export const Route = createFileRoute("/$sku/skills")({
  component: EventSkillsPage,
});
