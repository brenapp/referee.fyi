import { useQuery } from "@tanstack/react-query";
import { EventData } from "robotevents/out/endpoints/events";
import { MatchData } from "robotevents/out/endpoints/matches";
import { getMatchNotes } from "~utils/data/notes";

export function useMatchNote(event: EventData | undefined | null, match: MatchData | undefined | null) {
    return useQuery({
        queryKey: ["matchnotes", event?.sku, match?.id],
        queryFn: async () => {
            if (!event || !match) {
                return null;
            }

            return getMatchNotes(event, match);
        }
    })
};