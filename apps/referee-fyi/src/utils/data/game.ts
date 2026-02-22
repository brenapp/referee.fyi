import type { IncidentMatchHeadToHeadPeriod } from "@referee-fyi/share";
import { type ProgramCode, programs } from "robotevents";

export function getHeadToHeadPeriodsForProgram(
	programCode?: ProgramCode | number,
): IncidentMatchHeadToHeadPeriod[] {
	switch (programCode) {
		case programs.V5RC:
		case programs.VURC:
			return ["auto", "driver"];

		case programs.ADC:
		case programs.VIQRC:
			return ["driver"];

		case programs.VAIRC:
			return ["isolation", "interaction"];

		default: {
			return [];
		}
	}
}
