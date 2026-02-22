import { useParams } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import type { RichIncident } from "~utils/data/incident";

export type DialogState =
	| {
			open: true;
			initial?: Partial<RichIncident>;
	  }
	| {
			open: false;
	  };

export type UseNewIncidentDialogState = {
	open: boolean;
	setOpen: (state: DialogState) => void;

	incident: RichIncident;
	setIncidentField: <T extends keyof RichIncident>(
		key: T,
		value: RichIncident[T],
	) => void;
};

export function useNewIncidentDialogState(): UseNewIncidentDialogState {
	const { sku } = useParams({ strict: false });

	const [openState, setOpenState] = useState(false);

	const [incident, setIncident] = useState<RichIncident>({
		time: new Date(),
		event: sku ?? "",
		team: undefined,
		match: undefined,
		period: undefined,
		rules: [],
		notes: "",
		outcome: "Minor",
		assets: [],
		flags: [],
	});

	const setIncidentField = <T extends keyof RichIncident>(
		key: T,
		value: RichIncident[T],
	) => {
		setIncident((i) => ({
			...i,
			[key]: value,
		}));
	};

	const setOpen = useCallback((state: DialogState) => {
		if (state.open) {
			setIncident((i) => ({
				...i,
				...state.initial,
			}));
		}
		setOpenState(state.open);
	}, []);

	return {
		open: openState,
		setOpen,
		incident,
		setIncidentField,
	};
}
