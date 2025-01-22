import { useMemo, useState } from "react";
import { EventData } from "robotevents";
import { Spinner } from "~components/Spinner";
import { useEventIncidents } from "~utils/hooks/incident";
import { useDivisionTeams } from "~utils/hooks/robotevents";
import { useCurrentDivision } from "~utils/hooks/state";
import { ExclamationTriangleIcon, FlagIcon } from "@heroicons/react/20/solid";
import { Link } from "react-router-dom";
import { VirtualizedList } from "~components/VirtualizedList";
import { IconLabel, Input } from "~components/Input";
import { filterTeams } from "~utils/filterteams";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

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
      <VirtualizedList
        data={filteredTeams}
        options={{ estimateSize: () => 64 }}
        className="flex-1"
        parts={{ list: { className: "mb-12" } }}
      >
        {(team) => (
          <Link
            to={`/${event.sku}/team/${team.number}`}
            className="flex items-center gap-4 mt-4 h-12 text-zinc-50"
            aria-label={`Team ${team.number} ${team.team_name}. ${
              majorIncidents.get(team.number) ?? 0
            } major violations. ${
              minorIncidents.get(team.number) ?? 0
            } minor violations`}
          >
            <div className="flex-1">
              <p className="text-emerald-400 font-mono">{team.number}</p>
              <p className="overflow-hidden whitespace-nowrap text-ellipsis max-w-[20ch] lg:max-w-prose">
                {team.team_name}
              </p>
            </div>
            <div className="absolute right-0 bg-zinc-800 h-full w-32 px-2 flex items-center">
              <span className="text-red-400 mr-4" aria-label={``}>
                <FlagIcon height={24} className="inline" />
                <span className="font-mono ml-2">
                  {majorIncidents.get(team.number) ?? 0}
                </span>
              </span>
              <span className="text-yellow-400">
                <ExclamationTriangleIcon height={24} className="inline" />
                <span className="font-mono ml-2">
                  {minorIncidents.get(team.number) ?? 0}
                </span>
              </span>
            </div>
          </Link>
        )}
      </VirtualizedList>
    </section>
  );
};
