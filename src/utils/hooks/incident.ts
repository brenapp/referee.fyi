import { Incident, IncidentWithID, getIncident, getIncidentsByEvent, getIncidentsByTeam, newIncident } from "../data/incident";
import { useMutation, useQuery } from "react-query";

export function useIncident(id: string | undefined | null) {
    return useQuery<Incident | undefined>(["incidents", id], () => {
        if (!id) {
            return undefined;
        }
        return getIncident(id);
    });
};

export function useNewIncident() {
    return useMutation((incident: Incident) => newIncident(incident));
};

export function useEventIncidents(sku: string | undefined | null) {
    return useQuery<IncidentWithID[]>(["incidents", "event", sku], () => {
        if (!sku) {
            return [];
        }
        return getIncidentsByEvent(sku);
    });
}

export function useTeamIncidents(team: string | undefined | null) {
    return useQuery<IncidentWithID[]>(["incidents", "team", team], () => {
        if (!team) {
            return [];
        }
        return getIncidentsByTeam(team);
    });
}

export function useTeamIncidentsByEvent(team: string | undefined | null, sku: string | undefined | null) {
    return useQuery<IncidentWithID[]>(["incidents", "team", team, "event", sku], async () => {

        if (!team || !sku) {
            return [];
        }

        const incidents = await getIncidentsByTeam(team);
        if (!sku || !incidents) {
            return [];
        }

        return incidents.filter((incident) => incident.event === sku);
    });
};