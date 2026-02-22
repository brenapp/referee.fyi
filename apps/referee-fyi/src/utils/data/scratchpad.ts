import {
	initLWW,
	isKeyLWW,
	type LWWKeys,
	updateLWW,
} from "@referee-fyi/consistency";
import {
	type BaseMatchScratchpad,
	type DefaultV5RCMatchScratchpad,
	type DefaultVIQRCMatchScratchpad,
	type EditScratchpad,
	type MatchScratchpad,
	SCRATCHPAD_IGNORE,
	type ScratchpadKind,
} from "@referee-fyi/share";
import { type MatchData, programs, seasons } from "robotevents";
import { get, getMany, set, setMany, update } from "~utils/data/keyval";
import { getShareProfile } from "./share";

export function getScratchpadId(match: MatchData) {
	return `scratchpad_${match.event.code}_${
		match.division.id
	}_${match.name.replace(/ /g, "")}`;
}

export async function getMatchScratchpad<T extends MatchScratchpad>(
	id: string,
): Promise<T | undefined> {
	const data = await get<T>(id);
	return data;
}

export async function getManyMatchScratchpads<T extends MatchScratchpad>(
	ids: string[],
): Promise<Record<string, T>> {
	const values = await getMany<T>(ids);
	return Object.fromEntries(ids.map((id, i) => [id, values[i]!]));
}

export async function setMatchScratchpad<T extends MatchScratchpad>(
	id: string,
	scratchpad: T,
) {
	await update<Set<string>>(
		`scratchpad_${scratchpad.event}_idx`,
		(old) => old?.add(id) ?? new Set([id]),
	);
	return set(id, scratchpad);
}

export async function getScratchpadIdsForEvent(sku: string) {
	const data = await get<Set<string>>(`scratchpad_${sku}_idx`);
	return data ?? new Set();
}

export async function setManyMatchScratchpad<T extends MatchScratchpad>(
	entries: [id: string, scratchpad: T][],
) {
	return setMany(entries);
}

export async function editScratchpad<T extends MatchScratchpad>(
	id: string,
	scratchpad: EditScratchpad<T>,
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

		if (JSON.stringify(currentValue) !== JSON.stringify(newValue)) {
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

export function getScratchpadKindForSeason(
	seasonId: number,
): ScratchpadKind | null {
	switch (seasonId) {
		case seasons[programs.V5RC]["2025-2026"]: {
			return "DefaultV5RC";
		}
		case seasons[programs.VURC]["2025-2026"]: {
			return "DefaultV5RC";
		}
		case seasons[programs.VAIRC]["2025-2026"]: {
			return "DefaultV5RC";
		}

		case seasons[programs.V5RC]["2024-2025"]: {
			return "DefaultV5RC";
		}
		case seasons[programs.VURC]["2024-2025"]: {
			return "DefaultV5RC";
		}
		case seasons[programs.VAIRC]["2024-2025"]: {
			return "DefaultV5RC";
		}

		case seasons[programs.V5RC]["2023-2024"]: {
			return "DefaultV5RC";
		}
		case seasons[programs.VURC]["2023-2024"]: {
			return "DefaultV5RC";
		}
		case seasons[programs.VAIRC]["2023-2024"]: {
			return "DefaultV5RC";
		}

		case seasons[programs.VIQRC]["2024-2025"]: {
			return "DefaultVIQRC";
		}

		default: {
			return null;
		}
	}
}

export function getDefaultScratchpad(
	kind: ScratchpadKind,
	match: MatchData,
	peer: string,
): MatchScratchpad {
	const base: BaseMatchScratchpad = {
		id: getScratchpadId(match),
		event: match.event.code ?? "",
		match: {
			type: "match",
			division: match.division.id,
			name: match.name,
			id: match.id,
		},
		notes: "",
	};

	switch (kind) {
		case "DefaultV5RC": {
			return initLWW<DefaultV5RCMatchScratchpad>({
				peer,
				ignore: SCRATCHPAD_IGNORE,
				value: {
					...base,
					auto: "none",
					awp: { blue: false, red: false },
					timeout: { blue: false, red: false },
				},
			});
		}
		case "DefaultVIQRC": {
			return initLWW<DefaultVIQRCMatchScratchpad>({
				peer,
				ignore: SCRATCHPAD_IGNORE,
				value: base,
			});
		}
	}
}
