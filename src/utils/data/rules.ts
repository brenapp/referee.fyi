import { programs, seasons } from "robotevents";
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
export const GAME_FETCHERS: Record<number, () => Promise<Game>> = {
  // 2025-2026
  [seasons[programs.V5RC]["2025-2026"]]: PushBackRules,
  [seasons[programs.VURC]["2025-2026"]]: PushBackRules,
  [seasons[programs.VAIRC]["2025-2026"]]: PushBackRules,
  [seasons[programs.VIQRC]["2025-2026"]]: MixAndMatchRules,

  // 2024-2025
  [seasons[programs.V5RC]["2024-2025"]]: HighStakesRules,
  [seasons[programs.VURC]["2024-2025"]]: HighStakesRules,
  [seasons[programs.VAIRC]["2024-2025"]]: HighStakesRules,
  [seasons[programs.VIQRC]["2024-2025"]]: RapidRelayRules,
  [seasons[programs.ADC]["2024-2025"]]: MissionGravityRules,

  // 2023-2024
  [seasons[programs.V5RC]["2023-2024"]]: OverUnderRules,
  [seasons[programs.VURC]["2023-2024"]]: OverUnderRules,
  [seasons[programs.VAIRC]["2023-2024"]]: OverUnderRules,
  [seasons[programs.VIQRC]["2023-2024"]]: FullVolumeRules,
};
