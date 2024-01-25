/**
 * Stores recent events
 **/

import { get, set } from "idb-keyval";
import { useMutation, useQuery } from "@tanstack/react-query";
import { EventData } from "robotevents/out/endpoints/events";
import { Rule } from "./rules";
import { ProgramAbbr } from "robotevents/out/endpoints/programs";

export async function initHistoryStore() {
  const events = await get<EventData[]>("event_history");
  if (!events) {
    await set("event_history", []);
  }

  const rules = await get<Rule[]>("rule_history");
  if (!rules) {
    await set("rule_history", []);
  }
}

export async function getRecentEvents() {
  return (await get<EventData[]>("event_history")) ?? [];
}

export async function getRecentRules(program: ProgramAbbr) {
  const key = `rule_history_${program}`;
  return (await get<Rule[]>(key)) ?? [];
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

export function useRecentRules(program: ProgramAbbr, limit?: number) {
  return useQuery({
    queryKey: ["recent_rules"],
    queryFn: async () => {
      const rules = await getRecentRules(program);
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

export function useAddRecentRules(program: ProgramAbbr) {
  const key = `rule_history_${program}`;
  return useMutation({
    mutationFn: async (rules: Rule[]) => {
      if (rules.length < 1) {
        return;
      }

      const recent = (await getRecentRules(program)).filter((a) =>
        rules.every((b) => b.rule !== a.rule)
      );
      await set(key, [...rules, ...recent]);
    },
  });
}
