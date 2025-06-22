import { ProgramAbbr, Year } from "robotevents";
import { Game } from "~utils/hooks/rules";

import PushBack from "/rules/V5RC/2025-2026.json?url";
import MixAndMatch from "/rules/VIQRC/2025-2026.json?url";

import HighStakes from "/rules/V5RC/2024-2025.json?url";
import RapidRelay from "/rules/VIQRC/2024-2025.json?url";
import MissionGravity from "/rules/ADC/2024-2025.json?url";

import OverUnder from "/rules/V5RC/2023-2024.json?url";
import FullVolume from "/rules/VIQRC/2023-2024.json?url";

// 2025-2026
export const PushBackRules: () => Promise<Game> = async () =>
  fetch(PushBack).then((res) => res.json());

export const MixAndMatchRules: () => Promise<Game> = async () =>
  fetch(MixAndMatch).then((res) => res.json());

// 2024-2025
export const HighStakesRules: () => Promise<Game> = async () =>
  fetch(HighStakes).then((res) => res.json());

export const RapidRelayRules: () => Promise<Game> = async () =>
  fetch(RapidRelay).then((res) => res.json());

export const MissionGravityRules: () => Promise<Game> = async () =>
  fetch(MissionGravity).then((res) => res.json());

// 2023-2024
export const OverUnderRules: () => Promise<Game> = async () =>
  fetch(OverUnder).then((res) => res.json());

export const FullVolumeRules: () => Promise<Game> = async () =>
  fetch(FullVolume).then((res) => res.json());

// Supported games
export const GAME_FETCHERS: Partial<
  Record<`${ProgramAbbr}_${Year}`, () => Promise<Game>>
> = {
  // 2025-2026
  ["V5RC_2025-2026"]: PushBackRules,
  ["VURC_2025-2026"]: PushBackRules,
  ["VAIRC_2025-2026"]: PushBackRules,
  ["VIQRC_2025-2026"]: MixAndMatchRules,

  // 2024-2025
  ["V5RC_2024-2025"]: HighStakesRules,
  ["VURC_2024-2025"]: HighStakesRules,
  ["VAIRC_2024-2025"]: HighStakesRules,
  ["VIQRC_2024-2025"]: RapidRelayRules,
  ["ADC_2024-2025"]: MissionGravityRules,

  // 2023-2024
  ["V5RC_2023-2024"]: OverUnderRules,
  ["VURC_2023-2024"]: OverUnderRules,
  ["VAIRC_2023-2024"]: OverUnderRules,
  ["VIQRC_2023-2024"]: FullVolumeRules,
};
