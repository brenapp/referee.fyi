import type { InspectionStatus } from "~utils/hooks/incident";
import { Chip } from "./Chip";

const INSPECTION_STATUS_CLASSES: Record<InspectionStatus, string> = {
	passed: "bg-emerald-400 text-emerald-900",
	failed: "bg-red-400 text-red-900",
	unknown: "bg-zinc-500",
};

const INSPECTION_STATUS_LABELS: Record<InspectionStatus, string> = {
	passed: "Inspection Passing",
	failed: "Inspection Failing",
	unknown: "Not Inspected",
};

export const InspectionChip: React.FC<{ status: InspectionStatus }> = ({
	status,
}) => {
	if (status === "unknown") {
		return null;
	}
	return (
		<Chip className={INSPECTION_STATUS_CLASSES[status]}>
			{INSPECTION_STATUS_LABELS[status]}
		</Chip>
	);
};

export const InspectionStatusDot: React.FC<{ status: InspectionStatus }> = ({
	status,
}) => {
	if (status === "unknown") {
		return null;
	}

	return (
		<span
			className={`w-2 h-2 rounded-full flex-shrink-0 ${INSPECTION_STATUS_CLASSES[status]}`}
			title={INSPECTION_STATUS_LABELS[status]}
		/>
	);
};
