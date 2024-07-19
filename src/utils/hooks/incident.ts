import {
  Incident,
  deleteIncident,
  editIncident,
  getIncident,
  getIncidentsByEvent,
  getIncidentsByTeam,
  newIncident,
} from "../data/incident";
import {
  UseQueryResult,
  useMutation,
  useMutationState,
  useQuery,
} from "@tanstack/react-query";
import { Alliance, Match, MatchData } from "robotevents/out/endpoints/matches";
import { toast } from "~components/Toast";
import { useShareConnection } from "~models/ShareConnection";
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

export function useEventIncidents(sku: string | undefined | null) {
  return useQuery<Incident[]>({
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

export function useNewIncident() {
  const connection = useShareConnection();
  return useMutation({
    mutationKey: ["newIncident"],
    mutationFn: async (incident: Omit<Incident, "id">) => {
      try {
        const id = await newIncident(incident);
        connection.addIncident({ id, ...incident });
        return id;
      } catch (e) {
        toast({ type: "error", message: `${e}` });
      }
    },
    onSettled: () => {
      return queryClient.invalidateQueries({ queryKey: ["incidents"] });
    },
  });
}

export function useEditIncident() {
  const connection = useShareConnection();
  return useMutation({
    mutationKey: ["editIncident"],
    mutationFn: async (incident: Omit<Incident, "event" | "team">) => {
      try {
        const updated = await editIncident(incident.id, incident);
        connection.editIncident(updated!);
        return incident;
      } catch (e) {
        toast({ type: "error", message: `${e}` });
      }
    },
    onSettled: () => {
      return queryClient.invalidateQueries({ queryKey: ["incidents"] });
    },
  });
}

export function useDeleteIncident() {
  const connection = useShareConnection();
  return useMutation({
    mutationKey: ["deleteIncident"],
    mutationFn: async (id: string) => {
      try {
        await deleteIncident(id);
        connection.deleteIncident(id);
      } catch (e) {
        toast({ type: "error", message: `${e}` });
      }
    },
    onSettled: () => {
      return queryClient.invalidateQueries({ queryKey: ["incidents"] });
    },
  });
}

export function usePendingIncidents(
  predicate: (incident: Incident) => boolean
) {
  const newIncident = useMutationState({
    filters: {
      mutationKey: ["newIncident"],
      status: "pending",
    },
    select: (mutation) => mutation.state.variables as Incident,
  });

  const editIncident = useMutationState({
    filters: {
      mutationKey: ["editIncident"],
      status: "pending",
    },
    select: (mutation) => mutation.state.variables as Incident,
  });

  const deleteIncident = useMutationState({
    filters: {
      mutationKey: ["deleteIncident"],
      status: "pending",
    },
    select: (mutation) => mutation.state.variables as string,
  });

  return {
    newIncident: newIncident.filter(predicate),
    editIncident: editIncident.filter(predicate),
    deleteIncident,
  };
}

export function useTeamIncidents(team: string | undefined | null) {
  return useQuery<Incident[]>({
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
  return useQuery<Incident[]>({
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
    refetchOnMount: "always",
  });
}

export type TeamIncidentsByMatch = {
  team: string;
  incidents: Incident[];
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
