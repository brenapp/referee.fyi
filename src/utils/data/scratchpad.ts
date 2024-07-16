import { get, set } from "~utils/data/keyval";
import {
  BaseMatchScratchpad,
  EditScratchpad,
  HighStakesMatchScratchpad,
  MatchScratchpad,
  RapidRelayMatchScratchpad,
  SupportedGame,
  UnchangeableProperties,
} from "~share/MatchScratchpad";
import { getSender } from "./share";
import { Change } from "~share/revision";
import { MatchData } from "robotevents/out/endpoints/matches";
import { WebSocketSender } from "~share/api";
import { seasons } from "robotevents";
import { useShareConnection } from "~models/ShareConnection";

export function getScratchpadID(match: MatchData) {
  return `scratchpad_${match.event.code}_${
    match.division.id
  }_${match.name.replace(/ /g, "")}`;
}

export async function getMatchScratchpad<T extends MatchScratchpad>(
  match: MatchData
): Promise<T | undefined> {
  const id = getScratchpadID(match);
  const data = await get<T>(id);
  return data;
}

export async function setMatchScratchpad(
  match: MatchData,
  scratchpad: MatchScratchpad
) {
  const id = getScratchpadID(match);
  return set(id, scratchpad);
}

export async function editScratchpad<T extends MatchScratchpad>(
  match: MatchData,
  scratchpad: EditScratchpad<T>
) {
  const current = await getMatchScratchpad(match);

  if (!current) {
    return;
  }

  const changes: Change<MatchScratchpad, UnchangeableProperties>[] = [];
  for (const [key, currentValue] of Object.entries(scratchpad)) {
    if (["event", "match", "revision", "game"].includes(key)) continue;

    const newValue = current[key as keyof MatchScratchpad];

    if (JSON.stringify(currentValue) != JSON.stringify(newValue)) {
      changes.push({
        property: key,
        old: currentValue,
        new: newValue,
      } as Change<MatchScratchpad, UnchangeableProperties>);
    }
  }

  if (changes.length < 1) {
    return;
  }

  const user = await getSender();

  const revision = current.revision ?? {
    count: 0,
    user,
    history: [],
  };

  revision.count += 1;
  revision.history.push({
    user,
    date: new Date(),
    changes,
  });

  const value = {
    ...current,
    ...scratchpad,
    revision,
  };

  const id = getScratchpadID(match);
  useShareConnection.getState().updateScratchpad(id, value);
  await setMatchScratchpad(match, value);
}

export function getGameForSeason(seasonId: number): SupportedGame | null {
  switch (seasonId) {
    case seasons.get("V5RC", "2024-2025")!: {
      return "High Stakes";
    }
    case seasons.get("V5RC", "2023-2024")!: {
      return "High Stakes";
    }
    case seasons.get("VURC", "2024-2025")!: {
      return "High Stakes";
    }
    case seasons.get("VAIRC", "2024-2025")!: {
      return "High Stakes";
    }
    case seasons.get("VIQRC", "2024-2025")!: {
      return "Rapid Relay";
    }
    default: {
      return null;
    }
  }
}

export function getDefaultScratchpad(
  match: MatchData,
  user: WebSocketSender,
  game: SupportedGame
): MatchScratchpad {
  const base: BaseMatchScratchpad = {
    event: match.event.code,
    match: {
      type: "match",
      division: match.division.id,
      name: match.name,
      id: match.id,
    },
    game,
    notes: "",
  };

  const revision = { count: 0, user, history: [] };

  switch (game) {
    case "High Stakes": {
      const data: HighStakesMatchScratchpad = {
        ...base,
        game,
        revision,
        awp: { red: false, blue: false },
        auto: "none",
      };
      return data;
    }
    case "Rapid Relay": {
      const data: RapidRelayMatchScratchpad = {
        ...base,
        game,
        revision,
      };
      return data;
    }
  }
}
