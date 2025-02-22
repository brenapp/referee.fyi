import {
  DefaultError,
  QueryKey,
  UseQueryOptions,
  UseQueryResult,
  useQuery,
} from "@tanstack/react-query";
import {
  type MatchData,
  Color,
  Client,
  TeamData,
  EventData,
  ProgramCode,
  Event,
  Team,
  programs,
  Skill,
  Season,
  operations,
  rounds,
  Match,
} from "robotevents";
import { createPersister } from "~utils/data/query";

const client = Client({
  authorization: {
    token: import.meta.env.VITE_ROBOTEVENTS_TOKEN,
  },
});

const CURRENT_YEAR = "2024-2025" as const;

export type HookQueryOptions<
  TQueryFnData = unknown,
  TError = Error,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
> = Omit<
  UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>,
  "queryKey" | "queryFn"
>;

const matchPersister = createPersister<
  MatchData | MatchData[],
  Match | Match[]
>({
  serialize: (data) =>
    Array.isArray(data) ? data.map((m) => m.getData()) : data.getData(),
  deserialize: (data) =>
    Array.isArray(data) ? data.map((m) => new Match(m)) : new Match(data),
});

export function useEvent(
  sku: string | null | undefined,
  options?: HookQueryOptions<EventData | null | undefined>
): UseQueryResult<EventData | null | undefined> {
  return useQuery({
    queryKey: ["event", sku],
    queryFn: async ({ signal }) => {
      if (!sku) {
        return null;
      }

      const response = await client.events.getBySKU(sku, { signal });

      if (!response.data) {
        return null;
      }

      const event = response.data;
      return event.getData();
    },
    staleTime: Infinity,
    ...options,
  });
}

export function useEventSearch(
  query: operations["event_getEvents"]["parameters"]["query"],
  options?: HookQueryOptions<EventData[] | null | undefined>
) {
  return useQuery({
    queryKey: ["events_by_level", query],
    queryFn: async ({ signal }) => {
      const response = await client.events.search(query, { signal });

      if (!response.data) {
        return null;
      }

      const events = response.data;
      return events.map((e) => e.getData());
    },
    staleTime: Infinity,
    ...options,
  });
}

export function useTeam(
  number: string | null | undefined,
  program: ProgramCode,
  options?: HookQueryOptions<TeamData | null | undefined>
): UseQueryResult<TeamData | null | undefined> {
  return useQuery({
    queryKey: ["team", number, program],
    queryFn: async ({ signal }) => {
      if (!number) {
        return null;
      }

      const response = await client.teams.getByNumber(number, program, {
        signal,
      });

      if (!response.data) {
        return null;
      }

      const team = response.data;
      return team?.getData();
    },
    staleTime: 1000 * 60 * 60 * 4,
    ...options,
  });
}

export function useEventTeams<Select = TeamData[]>(
  eventData: EventData | null | undefined,
  options?: operations["event_getTeams"]["parameters"]["query"],
  queryOptions?: HookQueryOptions<TeamData[], DefaultError, Select>
): UseQueryResult<Select> {
  return useQuery({
    queryKey: ["teams", eventData?.sku, options],
    queryFn: async ({ signal }) => {
      if (!eventData) {
        return [];
      }

      const event = new Event(eventData, client.api);
      const teams = await event.teams(options, { signal });

      if (!teams.data) {
        return [];
      }

      return teams.data.map((team) => team.getData());
    },
    staleTime: 1000 * 60 * 60,
    ...queryOptions,
  });
}

type UseDivisionTeamsResult = {
  teams: TeamData[];
  divisionOnly: boolean;
};

export function useDivisionTeams(
  eventData: EventData | null | undefined,
  division: number | null | undefined,
  options?: HookQueryOptions<UseDivisionTeamsResult>
): UseQueryResult<UseDivisionTeamsResult> {
  const { data: teams, isSuccess: isTeamsSuccess } = useEventTeams(eventData);
  const { data: matches, isSuccess: isMatchesSuccess } = useEventMatches(
    eventData,
    division
  );

  return useQuery<UseDivisionTeamsResult>({
    queryKey: ["division_teams", eventData?.sku, division],
    queryFn: async () => {
      if (!eventData || !division) {
        return { teams: [], divisionOnly: false };
      }

      const event = new Event(eventData, client.api);

      // "Overall Finals" division IDs, which won't have rankings. Instead, get teams from the matches
      if (division > 10) {
        const ids =
          matches
            ?.map((m) =>
              m.alliances.flatMap((a) => a.teams.map((t) => t.team?.id))
            )
            .flat() ?? [];
        const divisionTeams = teams?.filter((t) => ids.includes(t.id)) ?? [];

        return {
          divisionOnly: true,
          teams: divisionTeams,
        };
      }

      const rankings = await event.rankings(division);

      if (!rankings.data) {
        return { divisionOnly: false, teams: teams! };
      }

      if (rankings.data.length < 1) {
        return { divisionOnly: false, teams: teams! };
      }

      const divisionTeams =
        teams?.filter((t) => rankings.data.some((r) => r.team?.id === t.id)) ??
        [];

      return {
        divisionOnly: true,
        teams: divisionTeams,
      };
    },
    staleTime: 1000 * 60 * 60,
    enabled: isTeamsSuccess && isMatchesSuccess,
    ...options,
  });
}

const roundUnknown = 0;
const roundOrder = [
  rounds.Practice,
  rounds.Qualification,
  rounds.RoundRobin,
  rounds.RoundOf16,
  rounds.Quarterfinals,
  rounds.Semifinals,
  rounds.Finals,
  rounds.TopN,
  roundUnknown,
] as number[];

export function logicalMatchComparison(a: MatchData, b: MatchData) {
  if (a.round !== b.round) {
    return roundOrder.indexOf(a.round) - roundOrder.indexOf(b.round);
  }

  if (a.instance !== b.instance) {
    return a.instance - b.instance;
  }

  if (a.matchnum !== b.matchnum) {
    return a.matchnum - b.matchnum;
  }

  // League events may have multiple quals/practice with the same matchnum, so
  // sort by scheduled time.
  if (a.scheduled || b.scheduled) {
    const scheduledA = new Date(a.scheduled ?? 0).getTime();
    const scheduledB = new Date(b.scheduled ?? 0).getTime();
    return scheduledA - scheduledB;
  }

  return 0;
}

export function useEventMatches<T = Match[]>(
  eventData: EventData | null | undefined,
  division: number | null | undefined,
  query?: operations["event_getDivisionMatches"]["parameters"]["query"],
  options?: HookQueryOptions<Match[], Error, T>
): UseQueryResult<T> {
  return useQuery({
    queryKey: ["matches", eventData?.sku, division, query],
    queryFn: async () => {
      if (!eventData || !division) {
        return [];
      }

      const event = new Event(eventData, client.api);
      const matches = await event.matches(division, query);

      if (!matches.data) {
        return [];
      }

      return matches.data.sort(logicalMatchComparison);
    },
    staleTime: 1000 * 60,
    persister: matchPersister,
    ...options,
  });
}

export function useEventMatchesForTeam(
  event: EventData | null | undefined,
  teamData: TeamData | null | undefined,
  color?: Color,
  options?: HookQueryOptions<Match[]>
) {
  return useQuery({
    queryKey: ["team_matches", event?.sku, teamData?.number],
    queryFn: async () => {
      if (!event || !teamData) {
        return [];
      }
      const team = new Team(teamData, client.api);
      const result = await team.matches({ "event[]": [event.id] });

      if (!result.data) {
        return [];
      }

      let matches = result.data;

      if (color) {
        matches = matches.filter((match) =>
          match.alliance(color).teams.some((t) => t.team?.id === team.id)
        );
      }

      return matches.sort(logicalMatchComparison);
    },
    staleTime: 1000 * 60,
    persister: matchPersister,
    ...options,
  });
}

export function useMatchTeams(
  event?: EventData | null,
  match?: MatchData | null
) {
  const { data: teams } = useEventTeams(event);

  if (!teams || !match) {
    return [];
  }

  const teamsInMatch =
    match?.alliances.flatMap((a) => a.teams.map((a) => a.team?.id)) ?? [];
  return teamsInMatch.map((id) => teams.find((t) => t.id === id)!);
}

export function useEventMatch(
  event: EventData | null | undefined,
  division: number | null | undefined,
  match: number | null | undefined
): UseQueryResult<Match | undefined> {
  return useEventMatches(
    event,
    division,
    {},
    {
      select: (matches) => matches?.find((m) => m.id === match),
    }
  );
}

export function useEventTeam(
  event: EventData | null | undefined,
  number: string | null | undefined
) {
  return useEventTeams(event, undefined, {
    select: (teams) => teams.find((t) => t.number === number),
  });
}

export const currentSeasons = (
  [programs.V5RC, programs.VIQRC, programs.VURC, programs.ADC] as const
).map((program) => client.seasons[program][CURRENT_YEAR]) as number[];

export function useEventsToday(
  options?: HookQueryOptions<EventData[]>
): UseQueryResult<EventData[]> {
  return useQuery({
    queryKey: ["events_today"],
    queryFn: async () => {
      const today = new Date();

      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 3);
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 3);

      const response = await client.events.search({
        start: yesterday.toISOString(),
        end: tomorrow.toISOString(),
        "season[]": currentSeasons,
      });

      if (!response.data) {
        return [];
      }

      const events = response.data;
      return events
        .map((event) => event.getData())
        .sort((a, b) => a.name.localeCompare(b.name));
    },
    ...options,
  });
}

export function useEventSkills(
  data: EventData | null | undefined,
  options?: operations["event_getSkills"]["parameters"]["query"],
  queryOptions?: HookQueryOptions<Skill[]>
) {
  return useQuery({
    queryKey: ["skills", data?.sku, options],
    queryFn: async () => {
      if (!data) {
        return [];
      }

      const event = new Event(data, client.api);
      const runs = await event.skills();

      if (!runs.data) {
        return [];
      }

      return runs.data;
    },
    ...queryOptions,
  });
}

export function useSeason(
  id?: number,
  queryOptions?: HookQueryOptions<Season | null>
) {
  return useQuery({
    queryKey: ["season", id],
    queryFn: async () => {
      if (!id) {
        return null;
      }
      const response = await client.seasons.get(id);
      if (!response.data) {
        return null;
      }

      return response.data;
    },
    staleTime: Infinity,
    ...queryOptions,
  });
}

export function useCurrentSeason(program?: ProgramCode | null) {
  // @ts-expect-error fix for as const - if program doesn't have a year just return undefined
  const id = program ? client.seasons?.[program]?.[CURRENT_YEAR] : undefined;
  return useSeason(id);
}
