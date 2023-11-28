import { useParams } from "react-router-dom";
import { useEvent } from "./robotevents";


export function useCurrentEvent() {
    const { sku } = useParams();
    return useEvent(sku ?? "");
};

export function useCurrentDivision() {
    const { division } = useParams();
    if (!division) return undefined;
    return Number.parseInt(division);
}