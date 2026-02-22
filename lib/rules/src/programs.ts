import type { ProgramAbbr } from "robotevents";

/**
 * When indexing a question in program Key, you should also index it in all
 * affiliated programs.
 **/
export const affiliatedPrograms: Partial<Record<ProgramAbbr, ProgramAbbr[]>> = {
	V5RC: ["V5RC", "VURC", "VAIRC"],
	VURC: ["VURC", "VAIRC"],
	VAIRC: ["VAIRC"],
	VIQRC: ["VIQRC"],
};

/**
 * Inverse of `affiliatedPrograms`, this maps each program to the
 * programs that are related to it.
 **/
export const relatedPrograms: Partial<Record<ProgramAbbr, ProgramAbbr[]>> = {
	V5RC: ["V5RC"],
	VURC: ["V5RC", "VURC"],
	VAIRC: ["V5RC", "VURC", "VAIRC"],
	VIQRC: ["VIQRC"],
};
