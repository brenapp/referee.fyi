import { useMemo } from "react";
import { EventData } from "robotevents/out/endpoints/events";
import { Spinner } from "~components/Spinner";
import { useEventIncidents } from "~utils/hooks/incident";
import { useDivisionTeams } from "~utils/hooks/robotevents";
import { useCurrentDivision } from "~utils/hooks/state";
import { FixedSizeList as List } from "react-window";
import { ExclamationTriangleIcon, FlagIcon } from "@heroicons/react/20/solid";
import AutoSizer from "react-virtualized-auto-sizer";
import { Link } from "react-router-dom";

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

  const teams = divisionTeams?.teams ?? [];

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

  return (
    <section className="flex-1">
      <Spinner show={isLoading || isPaused} />
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
                    <p className="h-full w-32 px-2 flex items-center">
                      <span className="text-red-400 mr-4">
                        <FlagIcon height={24} className="inline" />
                        <span className="font-mono ml-2">
                          {majorIncidents.get(team.number) ?? 0}
                        </span>
                      </span>
                      <span className="text-yellow-400">
                        <ExclamationTriangleIcon
                          height={24}
                          className="inline"
                        />
                        <span className="font-mono ml-2">
                          {minorIncidents.get(team.number) ?? 0}
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
  );
};
