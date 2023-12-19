import { useParams } from "react-router-dom";
import { useEvent } from "./robotevents";

export function useCurrentEvent() {
  const { sku } = useParams();
  return useEvent(sku ?? "");
}

export function useCurrentDivision(def?: number) {
  const { division } = useParams();
  if (!division) return def;
  return Number.parseInt(division);
}
