import type { InspectionStatus } from "~utils/hooks/incident";

const INSPECTION_STATUS_CLASSES: Record<InspectionStatus, string> = {
	passed: "bg-emerald-400",
	failed: "bg-red-400",
	unknown: "bg-zinc-500",
};

const INSPECTION_STATUS_LABELS: Record<InspectionStatus, string> = {
	passed: "Inspection Passing",
	failed: "Inspection Failing",
	unknown: "Not Inspected",
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

export const InspectionStatusLabel: React.FC<{
	status: InspectionStatus;
}> = ({ status }) => {
	return (
		<span className="flex items-center gap-2 text-sm text-zinc-300 flex-shrink-0">
			<InspectionStatusDot status={status} />
			{INSPECTION_STATUS_LABELS[status]}
		</span>
	);
};
