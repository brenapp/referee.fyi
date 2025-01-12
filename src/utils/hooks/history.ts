/**
 * Stores recent events
 **/

import { get, set } from "~utils/data/keyval";
import { useMutation, useQuery } from "@tanstack/react-query";
import { EventData } from "robotevents";
import { Rule } from "./rules";

export async function initHistoryStore() {
  const events = await get<EventData[]>("event_history");
  if (!events) {
    await set("event_history", []);
  }
}

export async function getRecentEvents() {
  return (await get<EventData[]>("event_history")) ?? [];
}

export async function getRecentRules(programId: number, season: number) {
  const key = `rule_history_${programId}_${season}`;
  return (await get<Rule[]>(key)) ?? [];
}

export async function setRecentRules(
  programId: number,
  season: number,
  rules: Rule[]
) {
  const key = `rule_history_${programId}_${season}`;
  await set(key, rules);
}

export function useRecentEvents(limit?: number) {
  return useQuery({
    queryKey: ["recent_events"],
    queryFn: async () => {
      const events = await getRecentEvents();
      return events.slice(0, limit);
    },
    staleTime: 0,
    refetchOnMount: "always",
  });
}

export function useRecentRules(
  programId: number,
  season: number,
  limit?: number
) {
  return useQuery({
    queryKey: ["recent_rules", programId, season],
    queryFn: async () => {
      const rules = await getRecentRules(programId, season);
      return rules.slice(0, limit);
    },
    staleTime: 0,
    refetchOnMount: "always",
  });
}

export function useAddEventVisited() {
  return useMutation({
    mutationFn: async (event: EventData) => {
      const events = (await getRecentEvents()).filter(
        (e) => e.sku !== event.sku
      );
      await set("event_history", [event, ...events]);
    },
  });
}

export function useAddRecentRules(programId: number, season: number) {
  const key = `rule_history_${programId}_${season}`;
  return useMutation({
    mutationFn: async (rules: Rule[]) => {
      if (rules.length < 1) {
        return;
      }

      const recent = (await getRecentRules(programId, season)).filter((a) =>
        rules.every((b) => b.rule !== a.rule)
      );
      await set(key, [...rules, ...recent]);
    },
  });
}
