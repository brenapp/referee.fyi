import { useParams } from "react-router-dom";
import { HookQueryOptions, useEvent } from "./robotevents";
import { EventData } from "robotevents/out/endpoints/events";

export function useSKU() {
  const { sku } = useParams();
  return sku;
}

export function useCurrentEvent(options?: HookQueryOptions<EventData | null | undefined>) {
  const { sku } = useParams();
  return useEvent(sku ?? "", options);
}

export function useCurrentDivision(def?: number) {
  const { division } = useParams();
  if (!division) return def;
  return Number.parseInt(division);
}
