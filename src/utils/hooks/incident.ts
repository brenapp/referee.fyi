import { BaseIncident, INCIDENT_IGNORE } from "@referee-fyi/share";
import {
  Incident,
  NewIncident,
  deleteIncident,
  editIncident,
  generateIncidentId,
  getDeletedIncidentsForEvent,
  getIncident,
  getIncidentsByEvent,
  getIncidentsByTeam,
  getManyIncidents,
  newIncident,
} from "../data/incident";
import {
  UseQueryResult,
  useMutation,
  useMutationState,
  useQuery,
} from "@tanstack/react-query";
import { Match, MatchData } from "robotevents";
import { toast } from "~components/Toast";
import { useShareConnection } from "~models/ShareConnection";
import { queryClient } from "~utils/data/query";
import { getShareProfile } from "~utils/data/share";
import { initLWW } from "@referee-fyi/consistency";
import { HookQueryOptions } from "./robotevents";

export function useIncident(
  id: string | undefined | null,
  options?: HookQueryOptions<Incident | undefined>
) {
  return useQuery<Incident | undefined>({
    queryKey: ["incidents", id],
    queryFn: () => {
      if (!id) {
        return undefined;
      }
      return getIncident(id);
    },
    staleTime: 0,
    refetchOnMount: "always",
    ...options,
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

export function useEventDeletedIncidents(sku: string | undefined | null) {
  return useQuery<Incident[]>({
    queryKey: ["incidents", "event", sku, "deleted"],
    queryFn: async () => {
      if (!sku) {
        return [];
      }
      const deleted = await getDeletedIncidentsForEvent(sku);
      const incidents = await getManyIncidents([...deleted]);
      return incidents.filter((i) => i !== undefined);
    },
    staleTime: 0,
  });
}

export function useNewIncident() {
  const connection = useShareConnection(["addIncident"]);
  return useMutation({
    mutationKey: ["newIncident"],
    mutationFn: async (incident: NewIncident) => {
      try {
        const { key: peer } = await getShareProfile();
        const result = await newIncident({
          data: incident,
          peer,
          id: generateIncidentId(),
        });
        connection.addIncident(result);
        return result;
      } catch (e) {
        toast({
          type: "error",
          message: "Could not create new incident!",
          context: JSON.stringify(e),
        });
      }
    },
    onSettled: () => {
      return queryClient.invalidateQueries({ queryKey: ["incidents"] });
    },
  });
}

export function useEditIncident() {
  const connection = useShareConnection(["editIncident"]);
  return useMutation({
    mutationKey: ["editIncident"],
    mutationFn: async (incident: Omit<BaseIncident, "event" | "team">) => {
      try {
        const updated = await editIncident(incident.id, incident);
        connection.editIncident(updated!);
        return incident;
      } catch (e) {
        toast({
          type: "error",
          message: "Could not edit incident!",
          context: JSON.stringify(e),
        });
      }
    },
    onSettled: () => {
      return queryClient.invalidateQueries({ queryKey: ["incidents"] });
    },
  });
}

export function useDeleteIncident() {
  const connection = useShareConnection(["deleteIncident"]);
  return useMutation({
    mutationKey: ["deleteIncident"],
    mutationFn: async (id: string) => {
      try {
        await deleteIncident(id);
        connection.deleteIncident(id);
      } catch (e) {
        toast({
          type: "error",
          message: "Could not delete incident!",
          context: JSON.stringify(e),
        });
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
    select: (mutation) => {
      const newIncident = mutation.state.variables as NewIncident;
      return initLWW<Incident>({
        value: { ...newIncident, id: `temp_incident_${mutation.mutationId}` },
        peer: "local",
        ignore: INCIDENT_IGNORE,
      });
    },
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

export function useTeamIncidents(
  team: string | undefined | null,
  options?: HookQueryOptions<Incident[]>
) {
  return useQuery<Incident[]>({
    queryKey: ["incidents", "team", team],
    queryFn: () => {
      if (!team) {
        return [];
      }
      return getIncidentsByTeam(team);
    },
    staleTime: 0,
    refetchOnMount: "always",
    ...options,
  });
}

export function useTeamIncidentsByEvent(
  team: string | undefined | null,
  sku: string | undefined | null,
  options?: HookQueryOptions<Incident[]>
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
    ...options,
  });
}

export type TeamIncidentsByMatch = {
  team: string;
  incidents: Incident[];
}[];

export function useTeamIncidentsByMatch(
  matchData?: MatchData | null,
  options?: HookQueryOptions<TeamIncidentsByMatch>
): UseQueryResult<TeamIncidentsByMatch> {
  return useQuery({
    queryKey: ["incidents", "match", matchData],
    queryFn: async () => {
      if (!matchData) {
        return [];
      }

      const match = new Match(matchData);
      const alliances = [match.alliance("red"), match.alliance("blue")];
      const teams =
        alliances.map((a) => a.teams.map((t) => t.team!.name)).flat() ?? [];

      const incidentsByTeam: TeamIncidentsByMatch = [];

      for (const team of teams) {
        const incidents = (await getIncidentsByTeam(team)).filter(
          (i) => i.event === match.event.code
        );

        incidentsByTeam.push({ team, incidents });
      }

      return incidentsByTeam;
    },
    ...options,
  });
}
