import { useMutation, useQuery } from "@tanstack/react-query";
import { MatchData } from "robotevents/out/endpoints/matches";
import {
  EditScratchpad,
  MatchScratchpad,
  UnchangeableProperties,
} from "~share/MatchScratchpad";
import {
  editScratchpad,
  getDefaultScratchpad,
  getGameForSeason,
  getMatchScratchpad,
  getScratchpadID,
  setMatchScratchpad,
} from "~utils/data/scratchpad";
import { useEvent } from "./robotevents";
import { getSender } from "~utils/data/share";
import { useSender } from "./share";
import { queryClient } from "~utils/data/query";
import { ChangeLog } from "~share/revision";
import { useMemo } from "react";

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

      const id = getScratchpadID(match);
      const current = await getMatchScratchpad(id);
      if (!current) {
        const sender = await getSender();
        const def = getDefaultScratchpad(match, sender, game);
        await setMatchScratchpad(id, def);
      }

      await editScratchpad(id, scratchpad);
      queryClient.invalidateQueries({
        exact: true,
        queryKey: [`scratchpad`, match],
      });
    },
  });
}

const UNCHANGEABLE_PROPERTIES = Object.keys({
  event: "",
  game: "",
  match: "",
  revision: "",
} satisfies Record<UnchangeableProperties, unknown>);

export function usePropertyLastChangeLogForScratchpad<
  T extends MatchScratchpad,
>(
  scratchpad: T | undefined | null
): Record<
  Exclude<keyof T, UnchangeableProperties>,
  ChangeLog<T, UnchangeableProperties> | null
> {
  return useMemo(() => {
    if (!scratchpad) {
      return {} as Record<
        Exclude<keyof T, UnchangeableProperties>,
        ChangeLog<T, UnchangeableProperties> | null
      >;
    }

    const properties = Object.keys(scratchpad).filter(
      (p) => !UNCHANGEABLE_PROPERTIES.includes(p)
    ) as Exclude<keyof T, UnchangeableProperties>[];

    const entries = properties.map(
      (key) =>
        [
          key,
          scratchpad.revision?.history.findLast((changelog) =>
            changelog.changes.some((change) => change.property === key)
          ) ?? null,
        ] as const
    );

    return Object.fromEntries(entries) as Record<
      Exclude<keyof T, UnchangeableProperties>,
      ChangeLog<T, UnchangeableProperties> | null
    >;
  }, [scratchpad]);
}
