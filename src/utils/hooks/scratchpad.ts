import { useMutation, useQuery } from "@tanstack/react-query";
import { MatchData } from "robotevents";
import {
  EditScratchpad,
  MatchScratchpad,
  ScratchpadUnchangeableProperties,
} from "@referee-fyi/share";
import {
  editScratchpad,
  getDefaultScratchpad,
  getGameForSeason,
  getMatchScratchpad,
  getScratchpadID,
  setMatchScratchpad,
} from "~utils/data/scratchpad";
import { useEvent } from "./robotevents";
import { getPeer } from "~utils/data/share";
import { queryClient } from "~utils/data/query";
import {
  LastWriteWinsConsistency,
  WithLWWConsistency,
} from "@referee-fyi/consistency";
import { useShareConnection } from "~models/ShareConnection";

export function useMatchScratchpad<T extends MatchScratchpad>(
  match?: MatchData | null
) {
  return useQuery({
    queryKey: ["scratchpad", match],
    queryFn: async () => {
      if (!match) {
        return null;
      }

      const id = getScratchpadID(match);
      const scratchpad = await getMatchScratchpad<T>(id);
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
  return useQuery({
    queryKey: ["default_match_scratchpad", event?.season.id],
    queryFn: async () => {
      if (!event || !match) {
        return null;
      }

      const game = getGameForSeason(event.season.id);
      if (!game) {
        return null;
      }

      const peer = await getPeer();
      return getDefaultScratchpad(match, peer, game) as T;
    },
    enabled: isSuccessEvent,
  });
}

export function useUpdateMatchScratchpad<T extends MatchScratchpad>(
  match?: MatchData
) {
  const { data: event } = useEvent(match?.event.code ?? "");
  const connection = useShareConnection();

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

      const id = getScratchpadID(match);
      const current = await getMatchScratchpad(id);
      if (!current) {
        const peer = await getPeer();
        const def = getDefaultScratchpad(match, peer, game);
        await setMatchScratchpad(id, def);
      }

      const value = await editScratchpad(id, scratchpad);
      connection.updateScratchpad(id, value!);
      queryClient.invalidateQueries({
        exact: true,
        queryKey: [`scratchpad`, match],
      });
    },
  });
}

export function usePropertyLastChangeLogForScratchpad<
  T extends MatchScratchpad,
>(
  scratchpad:
    | WithLWWConsistency<T, ScratchpadUnchangeableProperties>
    | undefined
    | null
): LastWriteWinsConsistency<T, ScratchpadUnchangeableProperties> | undefined {
  return scratchpad?.consistency;
}
