import { useMutation, useQuery } from "@tanstack/react-query";
import { MatchData } from "robotevents/out/endpoints/matches";
import { EditScratchpad, MatchScratchpad } from "~share/MatchScratchpad";
import {
  editScratchpad,
  getDefaultScratchpad,
  getGameForSeason,
  getMatchScratchpad,
  setMatchScratchpad,
} from "~utils/data/scratchpad";
import { useEvent } from "./robotevents";
import { getSender } from "~utils/data/share";
import { useSender } from "./share";
import { queryClient } from "~utils/data/query";

export function useMatchScratchpad<T extends MatchScratchpad>(
  match?: MatchData | null
) {
  return useQuery({
    queryKey: ["scratchpad", match],
    queryFn: async () => {
      if (!match) {
        return null;
      }

      const scratchpad = await getMatchScratchpad<T>(match);
      return scratchpad ?? null;
    },
  });
}

export function useDefaultScratchpad<T extends MatchScratchpad>(
  match?: MatchData
) {
  const { data: event, isSuccess: isSuccessEvent } = useEvent(
    match?.event.code ?? ""
  );
  const { data: sender, isSuccess: isSuccessSender } = useSender();
  return useQuery({
    queryKey: ["default_match_scratchpad", event?.season.id, sender],
    queryFn: () => {
      if (!event || !sender || !match) {
        return null;
      }

      const game = getGameForSeason(event.season.id);
      if (!game) {
        return null;
      }

      return getDefaultScratchpad(match, sender, game) as T;
    },
    enabled: isSuccessEvent && isSuccessSender,
  });
}

export function useUpdateMatchScratchpad<T extends MatchScratchpad>(
  match?: MatchData
) {
  const { data: event } = useEvent(match?.event.code ?? "");

  return useMutation({
    mutationKey: ["update_match_scratchpad", match],
    mutationFn: async (scratchpad: EditScratchpad<T>) => {
      if (!match || !event) {
        return null;
      }

      const game = getGameForSeason(event.season.id);
      if (!game) {
        return null;
      }

      const current = await getMatchScratchpad(match);
      if (!current) {
        const sender = await getSender();
        const def = getDefaultScratchpad(match, sender, game);
        await setMatchScratchpad(match, def);
      }

      await editScratchpad(match, scratchpad);
      queryClient.invalidateQueries({
        exact: true,
        queryKey: [`scratchpad`, match],
      });
    },
  });
}
