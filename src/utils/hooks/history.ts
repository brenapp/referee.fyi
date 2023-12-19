/**
 * Stores recent events
 **/

import { get, set } from "idb-keyval";
import { useMutation, useQuery } from "react-query";
import { EventData, Event } from "robotevents/out/endpoints/events";

export async function initHistoryStore() {
    const incidents = await get<EventData[]>("event_history");
    if (!incidents) {
        await set("event_history", []);
    }
};

export async function getRecentEvents() {
    return (await get<EventData[]>("event_history")) ?? [];
};


export function useRecentEvents(limit?: number) {
    return useQuery("recent_events", async () => {
        const events = await getRecentEvents();

        return events.slice(0, limit);
    });
};

export function useAddEventVisited() {
    return useMutation(
        async (event: Event) => {

            const data: EventData = {
                id: event.id,
                sku: event.sku,
                name: event.name,
                start: event.start,
                end: event.end,
                season: event.season,
                program: event.program,
                location: event.location,
                divisions: event.divisions,
                level: event.level,
                ongoing: event.ongoing,
                awards_finalized: event.awards_finalized
            }

            const events = (await getRecentEvents()).filter(e => e.sku !== event.sku)
            await set("event_history", [data, ...events])
        }
    )
}