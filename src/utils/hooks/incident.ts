import {
  Incident,
  IncidentWithID,
  getIncident,
  getIncidentsByEvent,
  getIncidentsByTeam,
  newIncident,
} from "../data/incident";
import { UseQueryResult, useMutation, useQuery } from "react-query";
import { Alliance, Match } from "robotevents/out/endpoints/matches";
import { queryClient } from "~utils/data/query";

export function useIncident(id: string | undefined | null) {
  return useQuery<Incident | undefined>(
    ["incidents", id],
    () => {
      if (!id) {
        return undefined;
      }
      return getIncident(id);
    },
    { cacheTime: 0 }
  );
}

export function useNewIncident() {
  return useMutation(async (incident: Incident) => {
    const id = await newIncident(incident);
    await queryClient.invalidateQueries("incidents");
    return id;
  });
}

export function useEventIncidents(sku: string | undefined | null) {
  return useQuery<IncidentWithID[]>(
    ["incidents", "event", sku],
    async () => {
      if (!sku) {
        return [];
      }
      return getIncidentsByEvent(sku);
    },
    { cacheTime: 0 }
  );
}

export function useTeamIncidents(team: string | undefined | null) {
  return useQuery<IncidentWithID[]>(
    ["incidents", "team", team],
    () => {
      if (!team) {
        return [];
      }
      return getIncidentsByTeam(team);
    },
    { cacheTime: 0 }
  );
}

export function useTeamIncidentsByEvent(
  team: string | undefined | null,
  sku: string | undefined | null
) {
  return useQuery<IncidentWithID[]>(
    ["incidents", "team", team, "event", sku],
    async () => {
      if (!team || !sku) {
        return [];
      }

      const incidents = await getIncidentsByTeam(team);
      if (!sku || !incidents) {
        return [];
      }

      return incidents.filter((incident) => incident.event === sku);
    },
    { cacheTime: 0 }
  );
}

export type TeamIncidentsByMatch = {
  team: string;
  incidents: IncidentWithID[];
}[];

export function useTeamIncidentsByMatch(
  match: Match | undefined | null
): UseQueryResult<TeamIncidentsByMatch> {
  return useQuery(["incidents", "match", match?.id], async () => {
    const alliances = [match?.alliance("red"), match?.alliance("blue")].filter(
      (r) => !!r
    ) as Alliance[];
    const teams =
      alliances.map((a) => a.teams.map((t) => t.team.name)).flat() ?? [];

    const incidentsByTeam: TeamIncidentsByMatch = [];

    for (const team of teams) {
      const incidents = (await getIncidentsByTeam(team)).filter(
        (i) => i.event === match?.event.code
      );

      incidentsByTeam.push({ team, incidents });
    }

    return incidentsByTeam;
  });
}
