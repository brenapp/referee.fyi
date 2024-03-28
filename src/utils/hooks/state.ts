import { useMatch, useParams } from "react-router-dom";
import { HookQueryOptions, useEvent } from "./robotevents";
import { EventData } from "robotevents/out/endpoints/events";

export function useSKU() {
  const { sku } = useParams();
  return sku;
}

export function useCurrentEvent(
  options?: HookQueryOptions<EventData | null | undefined>
) {
  const { sku } = useParams();
  return useEvent(sku ?? "", options);
}

export function useCurrentDivision(def?: number) {
  const match = useMatch("/:sku/:division");

  if (!match) {
    return def;
  }

  if (!match.params.division) {
    return def;
  }

  const division = Number.parseInt(match.params.division);
  if (Number.isNaN(division)) {
    return def;
  }

  return division;
}
