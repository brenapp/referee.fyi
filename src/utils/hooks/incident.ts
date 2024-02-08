import {
  Incident,
  IncidentWithID,
  deleteIncident,
  getIncident,
  getIncidentsByEvent,
  getIncidentsByTeam,
  newIncident,
} from "../data/incident";
import { UseQueryResult, useMutation, useQuery } from "@tanstack/react-query";
import { Alliance, Match, MatchData } from "robotevents/out/endpoints/matches";
import { toast } from "~components/Toast";
import { queryClient } from "~utils/data/query";

export function useIncident(id: string | undefined | null) {
  return useQuery<Incident | undefined>({
    queryKey: ["incidents", id],
    queryFn: () => {
      if (!id) {
        return undefined;
      }
      return getIncident(id);
    },
    staleTime: 0,
  });
}

export function useNewIncident() {
  return useMutation({
    mutationFn: async (incident: Incident) => {
      // Catch failed fetch
      try {
        const id = await newIncident(incident);
        await queryClient.invalidateQueries({ queryKey: ["incidents"] });
        return id;
      } catch (e) {
        toast({ type: "error", message: `${e}` });
      }
    },
  });
}

export function useEventIncidents(sku: string | undefined | null) {
  return useQuery<IncidentWithID[]>({
    queryKey: ["incidents", "event", sku],
    queryFn: async () => {
      if (!sku) {
        return [];
      }
      return getIncidentsByEvent(sku);
    },
    staleTime: 0,
  });
}

export function useDeleteIncident(id: string, updateRemote?: boolean) {
  return useMutation<unknown, Error, void>({
    mutationFn: async () => {
      try {
        await deleteIncident(id, updateRemote);
      } catch (e) {
        toast({ type: "error", message: `${e}` });
      }
      await queryClient.invalidateQueries({ queryKey: ["incidents"] });
    },
  });
}

export function useTeamIncidents(team: string | undefined | null) {
  return useQuery<IncidentWithID[]>({
    queryKey: ["incidents", "team", team],
    queryFn: () => {
      if (!team) {
        return [];
      }
      return getIncidentsByTeam(team);
    },
    staleTime: 0,
  });
}

export function useTeamIncidentsByEvent(
  team: string | undefined | null,
  sku: string | undefined | null
) {
  return useQuery<IncidentWithID[]>({
    queryKey: ["incidents", "team", team, "event", sku],
    queryFn: async () => {
      if (!team || !sku) {
        return [];
      }

      const incidents = await getIncidentsByTeam(team);
      if (!sku || !incidents) {
        return [];
      }

      return incidents.filter((incident) => incident.event === sku);
    },
    staleTime: 0,
  });
}

export type TeamIncidentsByMatch = {
  team: string;
  incidents: IncidentWithID[];
}[];

export function useTeamIncidentsByMatch(
  matchData: MatchData | undefined | null
): UseQueryResult<TeamIncidentsByMatch> {
  return useQuery({
    queryKey: ["incidents", "match", matchData?.id],
    queryFn: async () => {
      if (!matchData) {
        return [];
      }

      const match = new Match(matchData);
      const alliances = [match.alliance("red"), match.alliance("blue")].filter(
        (r) => !!r
      ) as Alliance[];
      const teams =
        alliances.map((a) => a.teams.map((t) => t.team.name)).flat() ?? [];

      const incidentsByTeam: TeamIncidentsByMatch = [];

      for (const team of teams) {
        const incidents = (await getIncidentsByTeam(team)).filter(
          (i) => i.event === match.event.code
        );

        incidentsByTeam.push({ team, incidents });
      }

      return incidentsByTeam;
    },
    staleTime: 0,
  });
}
