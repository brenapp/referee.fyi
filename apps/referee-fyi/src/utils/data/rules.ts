import type { ProgramAbbr, Year } from "robotevents";
import type { Game, Rule, RuleGroup } from "~utils/hooks/rules";
import MissionGravity from "/rules/ADC/2024-2025.json?url";
import OverUnder from "/rules/V5RC/2023-2024.json?url";

import HighStakes from "/rules/V5RC/2024-2025.json?url";
import PushBack from "/rules/V5RC/2025-2026.json?url";
import FullVolume from "/rules/VIQRC/2023-2024.json?url";
import RapidRelay from "/rules/VIQRC/2024-2025.json?url";
import MixAndMatch from "/rules/VIQRC/2025-2026.json?url";

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
	"V5RC_2025-2026": PushBackRules,
	"VURC_2025-2026": PushBackRules,
	"VAIRC_2025-2026": PushBackRules,
	"VIQRC_2025-2026": MixAndMatchRules,

	// 2024-2025
	"V5RC_2024-2025": HighStakesRules,
	"VURC_2024-2025": HighStakesRules,
	"VAIRC_2024-2025": HighStakesRules,
	"VIQRC_2024-2025": RapidRelayRules,
	"ADC_2024-2025": MissionGravityRules,

	// 2023-2024
	"V5RC_2023-2024": OverUnderRules,
	"VURC_2023-2024": OverUnderRules,
	"VAIRC_2023-2024": OverUnderRules,
	"VIQRC_2023-2024": FullVolumeRules,
};

/**
 * Usable order for rule groups based on user feedback.
 **/
export const RULEGROUP_ORDER = [
	// Specific Game
	"Specific Game Rules",
	"General Game Rules",

	// General Game
	"General Rules",
	"VEX U Robotics Competition Game Rules",

	// Safety
	"Safety Rules",

	// Tournament
	"Tournament Rules",
	"VEX AI Robotics Competition Tournament Rules",
	"VEX U Robotics Competition Tournament Rules",

	// Scoring
	"Scoring Rules",
	"VEX AI Robotics Scoring Rules",

	// Robot Rules
	"Robot Rules",
	"VEX AI Robotics Competition Robot Rules",
	"VEX U Robotics Competition Robot Rules",

	// Robot Skills
	"Robot Skills Challenge Rules",
	"VEX AI Robotics Competition Skills Rules",
	"VEX U Robotics Competition Robot Skills Rules",

	"VEX AI Robotics Competition General Rules",
];

export function sortRuleGroups(a: RuleGroup, b: RuleGroup) {
	const aIndex = RULEGROUP_ORDER.indexOf(a.name);
	const bIndex = RULEGROUP_ORDER.indexOf(b.name);

	if (aIndex === -1 && bIndex === -1) {
		return a.name.localeCompare(b.name);
	} else if (aIndex === -1) {
		return 1;
	} else if (bIndex === -1) {
		return -1;
	} else {
		return aIndex - bIndex;
	}
}

export function isRuleMatch(ruleGroup: RuleGroup, rule: Rule, query: string) {
	return query
		? rule.description.toLowerCase().includes(query.toLowerCase()) ||
				rule.rule.toLowerCase().includes(query.toLowerCase()) ||
				ruleGroup.name.toLowerCase().includes(query.toLowerCase())
		: true;
}
