import { get, getMany, set, setMany, update } from "~utils/data/keyval";
import {
  BaseMatchScratchpad,
  EditScratchpad,
  MatchScratchpad,
  SupportedGame,
  SCRATCHPAD_IGNORE,
  HighStakesMatchScratchpad,
  RapidRelayMatchScratchpad,
} from "@referee-fyi/share";
import { getShareProfile } from "./share";
import { MatchData, programs } from "robotevents";
import { seasons } from "robotevents";
import {
  initLWW,
  isKeyLWW,
  LWWKeys,
  updateLWW,
} from "@referee-fyi/consistency";

export function getScratchpadID(match: MatchData) {
  return `scratchpad_${match.event.code}_${
    match.division.id
  }_${match.name.replace(/ /g, "")}`;
}

export async function getMatchScratchpad<T extends MatchScratchpad>(
  id: string
): Promise<T | undefined> {
  const data = await get<T>(id);
  return data;
}

export async function getManyMatchScratchpads<T extends MatchScratchpad>(
  ids: string[]
): Promise<Record<string, T>> {
  const values = await getMany<T>(ids);
  return Object.fromEntries(ids.map((id, i) => [id, values[i]!]));
}

export async function setMatchScratchpad<T extends MatchScratchpad>(
  id: string,
  scratchpad: T
) {
  await update<Set<string>>(
    `scratchpad_${scratchpad.event}_idx`,
    (old) => old?.add(id) ?? new Set([id])
  );
  return set(id, scratchpad);
}

export async function getScratchpadIdsForEvent(sku: string) {
  const data = await get<Set<string>>(`scratchpad_${sku}_idx`);
  return data ?? new Set();
}

export async function setManyMatchScratchpad<T extends MatchScratchpad>(
  entries: [id: string, scratchpad: T][]
) {
  return setMany(entries);
}

export async function editScratchpad<T extends MatchScratchpad>(
  id: string,
  scratchpad: EditScratchpad<T>
): Promise<T | undefined> {
  const current = await getMatchScratchpad<T>(id);

  if (!current) {
    return;
  }

  let updated: T = current;
  const { key: peer } = await getShareProfile();

  for (const [key, currentValue] of Object.entries(scratchpad) as [
    LWWKeys<T>,
    unknown,
  ][]) {
    if (!isKeyLWW(key, SCRATCHPAD_IGNORE)) continue;

    const newValue = current[key as keyof T];

    if (JSON.stringify(currentValue) != JSON.stringify(newValue)) {
      updated = updateLWW(updated, {
        key,
        value: currentValue,
        peer,
      });
    }
  }

  await setMatchScratchpad(id, updated);
  return updated;
}

export function getGameForSeason(seasonId: number): SupportedGame | null {
  switch (seasonId) {
    case seasons[programs.V5RC]["2024-2025"]: {
      return "High Stakes";
    }
    case seasons[programs.V5RC]["2023-2024"]: {
      return "High Stakes";
    }
    case seasons[programs.VURC]["2024-2025"]: {
      return "High Stakes";
    }
    case seasons[programs.VAIRC]["2024-2025"]: {
      return "High Stakes";
    }
    case seasons[programs.VIQRC]["2024-2025"]: {
      return "Rapid Relay";
    }
    default: {
      return null;
    }
  }
}

export function getDefaultScratchpad(
  match: MatchData,
  peer: string,
  game: SupportedGame
): MatchScratchpad {
  const base: BaseMatchScratchpad = {
    id: getScratchpadID(match),
    event: match.event.code ?? "",
    match: {
      type: "match",
      division: match.division.id,
      name: match.name,
      id: match.id,
    },
    game,
    notes: "",
  };

  switch (game) {
    case "High Stakes": {
      return initLWW<HighStakesMatchScratchpad>({
        peer,
        ignore: SCRATCHPAD_IGNORE,
        value: {
          ...base,
          game: "High Stakes",
          auto: "none",
          awp: { blue: false, red: false },
          timeout_used: { blue: false, red: false },
        },
      });
    }
    case "Rapid Relay": {
      return initLWW<RapidRelayMatchScratchpad>({
        peer,
        ignore: SCRATCHPAD_IGNORE,
        value: { ...base, game: "Rapid Relay" },
      });
    }
  }
}
