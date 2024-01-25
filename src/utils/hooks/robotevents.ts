import * as robotevents from "robotevents";
import { UndefinedInitialDataOptions, UseQueryResult, useQuery } from "@tanstack/react-query";
import {
  Round,
  type MatchData,
  Color,
} from "robotevents/out/endpoints/matches";
import { ProgramAbbr } from "robotevents/out/endpoints/programs";
import {
  Team,
  TeamData,
  TeamOptionsFromEvent,
} from "robotevents/out/endpoints/teams";
import { EventData } from "robotevents/out/endpoints/events";
import { useMemo } from "react";

const ROBOTEVENTS_TOKEN =
  "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIzIiwianRpIjoiYjM5Y2I1NGNhMTk0OTM0ODNmNTc0MDQ2MTRhZDY0MDZjYTY1ZmQzMjAzNDlhMmM5YmUwOThlNmJjNzhhZWJmZmZjYzU0ZWY2MTQ2ZmQyYjEiLCJpYXQiOjE2ODc2NDIzODcuNTUwMjg4LCJuYmYiOjE2ODc2NDIzODcuNTUwMjkxMSwiZXhwIjoyNjM0NDE3MTg3LjUzNzIzNjIsInN1YiI6Ijk3MDY5Iiwic2NvcGVzIjpbXX0.k0DEt3QRKkgZnyV8X9mDf6VYyc8aOsIEfQbVN4Gi6Csr7O5ILLGFENXZouvplqbcMDdQ8gBMMLg5hIR38RmrTsKcWHMndq1T8wYkGZQfRhc_uZYLQhGQCaanf_F_-gnKocFwT1AKQJmAPkAbV-Itb2UzHeGpNuW8vV_TaNL3coaYvmM6rubwBuNYgyZhTHW_Mgvzh5-XBqqGpmQLm9TGl4gkeqnS-6a5PfoqRTc8v3CQWSCURFry5BA2oXz0lcWmq92FY5crr2KKv1O3chPr--oMba97elY0y9Dw0q2ipKcTm4pE7bbFP8t7-a_RKU4OyXuHRIQXjw3gEDCYXY5Hp22KMY0idnRIPhat6fybxcRfeyzUzdnubRBkDMNklwlgNCyeu2ROqEOYegtu5727Wwvy2I-xW-ZVoXg0rggVu7jVq6zmBqDFIcu50IS9R4P6a244pg2STlBaAGpzT2VfUqCBZrbtBOvdmdNzxSKIkl1AXeOIZOixo1186PX54p92ehXfCbcTgWrQSLuAAg_tBa6T7UFKFOGecVFo3v0vkmE__Q5-701f1qqcdDRNlOG-bzzFh9QLEdJWlpEajwYQ1ZjTAlbnBpKy3IrU0Aa-Jr0aqxtzgr5ZlghNtOcdYYRw5_BN0BOMmAnkvtm0_xzIJSsFbWJQJ8QpPk_n4zKZf-Y";

robotevents.authentication.setBearer(ROBOTEVENTS_TOKEN);

export function useEvent(sku: string) {
  return useQuery({
    queryKey: ["event", sku],
    queryFn: async () => {
      if (!sku) {
        return null;
      }

      const event = await robotevents.events.get(sku);
      return event?.getData();
    },
    staleTime: Infinity,
  });
}

export function useTeam(
  numberOrID: string | number | null | undefined,
  program?: ProgramAbbr
) {
  return useQuery({
    queryKey: ["team", numberOrID],
    queryFn: async () => {
      if (!numberOrID) {
        return null;
      }

      const team = await robotevents.teams.get(numberOrID, program);
      return team?.getData();
    },
    staleTime: 1000 * 60 * 60 * 4,
  });
}

export function useEventTeams(
  eventData: EventData | null | undefined,
  options?: TeamOptionsFromEvent
): UseQueryResult<TeamData[]> {
  return useQuery({
    queryKey: ["teams", eventData?.sku, options],
    queryFn: async () => {
      if (!eventData) {
        return [];
      }

      const event = new robotevents.events.Event(eventData);
      const teams = await event.teams({ registered: true, ...options });
      return teams.array().map((team) => team.getData());
    },
    staleTime: 1000 * 60 * 60,
  });
}

type UseDivisionTeamsResult = {
  teams: TeamData[];
  divisionOnly: boolean;
};

export function useDivisionTeams(eventData: EventData | null | undefined, division: number | null | undefined) {
  const { data: teams, isSuccess: isTeamsSuccess } = useEventTeams(eventData);
  const { data: matches, isSuccess: isMatchesSuccess } = useEventMatches(eventData, division);

  return useQuery<UseDivisionTeamsResult>({
    queryKey: ["division_teams", eventData?.sku, division],
    queryFn: async () => {
      if (!eventData || !division) {
        return { teams: [], divisionOnly: false };
      }

      const event = new robotevents.events.Event(eventData);

      // "Overall Finals" division IDs, which won't have rankings. Instead, get teams from the matches
      if (division > 10) {
        const ids = matches?.map(m => m.alliances.flatMap(a => a.teams.map(t => t.team.id))).flat() ?? []
        const divisionTeams = teams?.filter(t => ids.includes(t.id)) ?? [];

        return {
          divisionOnly: true,
          teams: divisionTeams
        }
      };

      const rankings = await event.rankings(division);

      if (rankings.size < 1) {
        return { divisionOnly: false, teams: teams! };
      }

      const divisionTeams = teams?.filter(t => rankings.some(r => r.team.id === t.id)) ?? [];
      return {
        divisionOnly: true,
        teams: divisionTeams
      }
    },
    staleTime: 1000 * 60 * 60,
    enabled: isTeamsSuccess && isMatchesSuccess
  });
};

export function logicalMatchComparison(a: MatchData, b: MatchData) {
  const roundOrder = [
    Round.Practice,
    Round.Qualification,
    Round.RoundOf16,
    Round.Quarterfinals,
    Round.Semifinals,
    Round.Finals,
  ];

  if (a.round !== b.round) {
    return roundOrder.indexOf(a.round) - roundOrder.indexOf(b.round);
  }

  if (a.instance !== b.instance) {
    return a.instance - b.instance;
  }

  return a.matchnum - b.matchnum;
}

export function useEventMatches(
  eventData: EventData | null | undefined,
  division: number | null | undefined,
  options?: UndefinedInitialDataOptions<MatchData[]>
): UseQueryResult<MatchData[]> {
  return useQuery({
    queryKey: ["matches", eventData?.sku, division],
    queryFn: async () => {
      if (!eventData || !division) {
        return [];
      }

      const event = new robotevents.events.Event(eventData);
      const matches = await event.matches(division);

      return matches
        .array()
        .map((match) => match.getData())
        .sort(logicalMatchComparison);
    },
    staleTime: 1000 * 60,
    ...options
  });
}

export function useEventMatchesForTeam(
  event: EventData | null | undefined,
  teamData: TeamData | null | undefined,
  color?: Color,
  options?: UndefinedInitialDataOptions<MatchData[]>
) {
  return useQuery({
    queryKey: ["team_matches", event?.sku, teamData?.number],
    queryFn: async () => {
      if (!event || !teamData) {
        return [];
      }
      const team = new Team(teamData);
      let matches = (await team.matches({ event: [event.id] })).array();

      if (color) {
        matches = matches.filter((match) =>
          match.alliance(color).teams.some((t) => t.team.id === team.id)
        );
      }

      return matches
        .map((match) => match.getData())
        .sort(logicalMatchComparison);
    },
    staleTime: 1000 * 60,
    ...options
  });
}

export function useMatchTeams(match?: MatchData | null) {
  return useMemo(() => {
    if (!match) {
      return null;
    }

    const teams = match.alliances
      .map((alliance) => alliance.teams.map((t) => t.team.name))
      .flat();

    return teams;
  }, [match]);
}

export function useEventMatch(
  event: EventData | null | undefined,
  division: number | null | undefined,
  match: number | null | undefined
): MatchData | null {
  const matches = useEventMatches(event, division);

  const matchArray = matches.data ?? [];
  return matchArray.find((m) => m.id === match) ?? null;
}

export function useEventTeam(
  event: EventData | null | undefined,
  number: string | null | undefined
) {
  const { data: teams } = useEventTeams(event);

  if (!number) {
    return undefined;
  }

  return teams?.find((team) => team.number === number);
}

export function useEventsToday(): UseQueryResult<EventData[]> {
  return useQuery({
    queryKey: ["events_today"],
    queryFn: async () => {
      const currentSeasons = (["VRC", "VEXU", "VIQRC"] as const).map(
        (program) => robotevents.seasons.current(program)
      ) as number[];
      const today = new Date();

      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 3);
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 3);

      const events = await robotevents.events.search({
        start: yesterday.toISOString(),
        end: tomorrow.toISOString(),
        season: currentSeasons,
      });

      return events
        .map((event) => event.getData())
        .sort((a, b) => a.name.localeCompare(b.name));
    },
  });
}
