import { useMutation, useQuery } from "@tanstack/react-query";
import { MatchData } from "robotevents";
import type {
  EditScratchpad,
  MatchScratchpad,
  ScratchpadUnchangeableProperties,
} from "@referee-fyi/share";
import {
  editScratchpad,
  getDefaultScratchpad,
  getScratchpadKindForSeason,
  getMatchScratchpad,
  getScratchpadID,
  setMatchScratchpad,
} from "~utils/data/scratchpad";
import { useEvent } from "./robotevents";
import { getShareProfile } from "~utils/data/share";
import { queryClient } from "~utils/data/query";
import type {
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

export function useMatchScratchpads<T extends MatchScratchpad>(
  matches?: MatchData[] | null
) {
  return useQuery({
    queryKey: ["scratchpads", matches],
    queryFn: async () => {
      if (!matches) {
        return [];
      }

      const scratchpads = await Promise.all(
        matches.map(async (match) => {
          const id = getScratchpadID(match);
          const scratchpad = await getMatchScratchpad<T>(id);
          return scratchpad ?? null;
        })
      );

      return scratchpads;
    },
  });
}

export function useDefaultScratchpad<T extends MatchScratchpad>(
  match?: MatchData | null
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

      const kind = getScratchpadKindForSeason(event.season.id);
      if (!kind) {
        return null;
      }

      const { key: peer } = await getShareProfile();
      return getDefaultScratchpad(kind, match, peer) as T;
    },
    enabled: isSuccessEvent,
  });
}

export function useUpdateMatchScratchpad<T extends MatchScratchpad>(
  match?: MatchData
) {
  const { data: event } = useEvent(match?.event.code ?? "");
  const connection = useShareConnection(["updateScratchpad"]);

  return useMutation({
    mutationKey: ["update_match_scratchpad", match],
    mutationFn: async (scratchpad: EditScratchpad<T>) => {
      if (!match || !event) {
        return null;
      }

      const kind = getScratchpadKindForSeason(event.season.id);
      if (!kind) {
        return null;
      }

      const id = getScratchpadID(match);
      const current = await getMatchScratchpad(id);
      if (!current) {
        const { key: peer } = await getShareProfile();
        const def = getDefaultScratchpad(kind, match, peer);
        await setMatchScratchpad(id, def);
      }

      const value = await editScratchpad(id, scratchpad);
      connection.updateScratchpad(id, value!);
      queryClient.invalidateQueries({
        exact: true,
        queryKey: ["scratchpad", match],
      });
      queryClient.invalidateQueries({
        queryKey: ["scratchpads"],
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
