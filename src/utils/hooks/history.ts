/**
 * Stores recent events
 **/

import { get, set } from "idb-keyval";
import { useMutation, useQuery } from "react-query";
import { EventData, Event } from "robotevents/out/endpoints/events";
import { Rule } from "./rules";

export async function initHistoryStore() {
    const events = await get<EventData[]>("event_history");
    if (!events) {
        await set("event_history", []);
    }

    const rules = await get<Rule[]>("rule_history");
    if (!rules) {
        await set("rule_history", []);
    }
};

export async function getRecentEvents() {
    return (await get<EventData[]>("event_history")) ?? [];
};

export async function getRecentRules() {
    return (await get<Rule[]>("rule_history")) ?? [];

}

export function useRecentEvents(limit?: number) {
    return useQuery("recent_events", async () => {
        const events = await getRecentEvents();

        return events.slice(0, limit);
    });
};

export function useRecentRules(limit?: number) {
    return useQuery("recent_rules", async () => {
        const rules = await getRecentRules();
        return rules.slice(0, limit);
    }, { cacheTime: 0 });
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

export function useAddRecentRules() {
    return useMutation(
        async (rules: Rule[]) => {
            if (rules.length < 1) {
                return;
            }

            const recent = (await getRecentRules()).filter(a => rules.every(b => b.rule !== a.rule))
            await set("rule_history", [...rules, ...recent])
        }
    )
}
