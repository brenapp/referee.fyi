import { useCallback, useMemo, useState } from "react";
import { EventData } from "robotevents";
import { Spinner } from "~components/Spinner";
import { useEventIncidents } from "~utils/hooks/incident";
import { useDivisionTeams } from "~utils/hooks/robotevents";
import { useCurrentDivision } from "~utils/hooks/state";
import { ExclamationTriangleIcon, FlagIcon } from "@heroicons/react/20/solid";
import { VirtualizedList } from "~components/VirtualizedList";
import { IconLabel, Input } from "~components/Input";
import { filterTeams } from "~utils/filterteams";
import {
  ArrowRightIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { Button, LinkButton } from "~components/Button";
import { RichIncident } from "~utils/data/incident";
import { EventNewIncidentDialog } from "../dialogs/new";
import { MenuButton } from "~components/MenuButton";
import { RulesSummary } from "~components/RulesSummary";

export type EventTagProps = {
  event: EventData;
};

export const EventTeamsTab: React.FC<EventTagProps> = ({ event }) => {
  const division = useCurrentDivision();
  const {
    data: divisionTeams,
    isLoading,
    isPaused,
  } = useDivisionTeams(event, division);
  const { data: incidents } = useEventIncidents(event.sku);
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
  const teams = useMemo(() => divisionTeams?.teams ?? [], [divisionTeams]);

  const majorIncidents = useMemo(() => {
    if (!incidents) return new Map<string, number>();

    const grouped = new Map<string, number>();

    for (const incident of incidents) {
      if (incident.outcome !== "Major") continue;
      const key = incident.team ?? "<none>";
      const count = grouped.get(key) ?? 0;
      grouped.set(key, count + 1);
    }

    return grouped;
  }, [incidents]);

  const minorIncidents = useMemo(() => {
    if (!incidents) return new Map<string, number>();

    const grouped = new Map<string, number>();

    for (const incident of incidents) {
      if (incident.outcome === "Major") continue;
      const key = incident.team ?? "<none>";
      const count = grouped.get(key) ?? 0;
      grouped.set(key, count + 1);
    }

    return grouped;
  }, [incidents]);

  const filteredTeams = useMemo(
    () => (teams ? filterTeams(teams, filter) : []),
    [filter, teams]
  );

  return (
    <section className="contents">
      <IconLabel icon={<MagnifyingGlassIcon height={24} />}>
        <Input
          placeholder="Search teams..."
          className="flex-1"
          value={filter}
          onChange={(e) => setFilter(e.currentTarget.value.toUpperCase())}
        />
      </IconLabel>
      <Spinner show={isLoading || isPaused} />
      <EventNewIncidentDialog
        open={newIncidentDialogOpen}
        setOpen={setNewIncidentDialogOpen}
        initial={newIncidentDialogInitial}
      />
      <VirtualizedList
        data={filteredTeams}
        options={{ estimateSize: () => 64 }}
        className="flex-1"
        parts={{ list: { className: "mb-12" } }}
      >
        {(team) => (
          <MenuButton
            mode="transparent"
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
                </div>
                <RulesSummary
                  className="break-all"
                  incidents={incidents ?? []}
                  filter={(i) => i.team == team.number}
                />
                <LinkButton
                  to={`/${event.sku}/team/${team.number}`}
                  className="w-full mt-4 flex items-center"
                >
                  <span className="flex-1">Details</span>
                  <ArrowRightIcon height={20} className="text-emerald-400" />
                </LinkButton>
                <hr className="mt-4 border-zinc-600" />
                <Button
                  mode="normal"
                  className="mt-4 bg-blue-600"
                  onClick={() =>
                    openNewIncidentDialog({
                      team: team.number,
                      outcome: "General",
                    })
                  }
                >
                  <FlagIcon height={20} className="inline mr-2 " />
                  General
                </Button>
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
                  className="mt-4 bg-yellow-500"
                  onClick={() =>
                    openNewIncidentDialog({
                      team: team.number,
                      outcome: "Minor",
                    })
                  }
                >
                  <FlagIcon height={20} className="inline mr-2 " />
                  Minor
                </Button>
                <Button
                  mode="normal"
                  className="mt-4 bg-red-500"
                  onClick={() =>
                    openNewIncidentDialog({
                      team: team.number,
                      outcome: "Major",
                    })
                  }
                >
                  <FlagIcon height={20} className="inline mr-2 " />
                  Major
                </Button>
              </nav>
            }
            className="flex items-center gap-4 mt-4 p-0 h-12 text-zinc-50"
            aria-label={`Team ${team.number} ${team.team_name}. ${
              majorIncidents.get(team.number) ?? 0
            } major violations. ${
              minorIncidents.get(team.number) ?? 0
            } minor violations`}
          >
            <div className="flex-1">
              <p className="text-emerald-400 font-mono">{team.number}</p>
              <p className="overflow-hidden whitespace-nowrap text-ellipsis max-w-[24ch] lg:max-w-prose">
                {team.team_name}
              </p>
            </div>
            <div className="absolute right-0 bg-zinc-800 h-full w-32 px-2 flex items-center justify-between">
              <span className="text-red-400 mr-4" aria-label={``}>
                <FlagIcon height={20} className="inline" />
                <span className="font-mono ml-2">
                  {majorIncidents.get(team.number) ?? 0}
                </span>
              </span>
              <span className="text-yellow-400">
                <ExclamationTriangleIcon height={20} className="inline" />
                <span className="font-mono ml-2">
                  {minorIncidents.get(team.number) ?? 0}
                </span>
              </span>
            </div>
          </MenuButton>
        )}
      </VirtualizedList>
    </section>
  );
};
