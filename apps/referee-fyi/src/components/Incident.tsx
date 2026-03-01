import { EllipsisVerticalIcon } from "@heroicons/react/20/solid";
import { UserCircleIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { twMerge } from "tailwind-merge";
import {
	type Incident as IncidentData,
	type IncidentOutcome,
	matchToString,
} from "~utils/data/incident";
import { usePeerUserName } from "~utils/data/share";
import { useEventTeam } from "~utils/hooks/robotevents";
import { useRulesForEvent } from "~utils/hooks/rules";
import { useCurrentEvent } from "~utils/hooks/state";
import { AssetPreview } from "./Assets";
import { Button, type ButtonProps } from "./Button";
import { EditIncidentDialog } from "./dialogs/edit";
import { RulesDisplay } from "./Input";
import { MenuButton } from "./MenuButton";
import { Warning } from "./Warning";

const IncidentOutcomeBackgroundClasses: { [O in IncidentOutcome]: string } = {
	Minor: "bg-yellow-400 text-yellow-900",
	Major: "bg-red-400 text-red-900",
	Disabled: "bg-blue-400 text-blue-900",
	General: "bg-zinc-300 text-zinc-900",
	InspectionPassed: "bg-zinc-300 text-zinc-900",
	InspectionFailed: "bg-red-400 text-zinc-900",
};

export type IncidentProps = {
	incident: IncidentData;
	readonly?: boolean;
} & ButtonProps;

export type IncidentHighlightProps = {
	incident: IncidentData;
};

export const IncidentHighlights: React.FC<IncidentHighlightProps> = ({
	incident,
}) => {
	const { data: eventData } = useCurrentEvent();
	const { data: game } = useRulesForEvent(eventData);

	const firstRule = incident.rules[0];
	const firstRuleIcon = game?.rulesLookup?.[firstRule]?.icon;

	return (
		<>
			<span key={`${incident.id}-name`}>{incident.team}</span>
			{"•"}
			<span key={`${incident.id}-match`}>
				{incident.match ? matchToString(incident.match) : "Non-Match"}
			</span>
			{"•"}
			<span className="flex gap-x-1">
				{firstRuleIcon && (
					<img
						alt="Icon"
						className="max-h-5 max-w-5 object-contain"
						src={firstRuleIcon}
					></img>
				)}
				<span>{firstRule}</span>
			</span>
			{incident.rules.length >= 2 ? (
				<span>+ {incident.rules.length - 1}</span>
			) : null}
			{incident.rules.length > 0 ? "•" : null}
			<span key={`${incident.id}-outcome`}>{incident.outcome}</span>
		</>
	);
};

export const Incident: React.FC<IncidentProps> = ({
	incident,
	readonly,
	...props
}) => {
	const [editIncidentOpen, setEditIncidentOpen] = useState(false);

	return (
		<>
			<EditIncidentDialog
				id={incident.id}
				open={editIncidentOpen}
				setOpen={setEditIncidentOpen}
			/>
			<MenuButton
				mode="transparent"
				menu={
					<IncidentMenu
						incident={incident}
						readonly={readonly}
						setEditIncidentOpen={setEditIncidentOpen}
					>
						{props.children}
					</IncidentMenu>
				}
				{...props}
				className={twMerge(
					IncidentOutcomeBackgroundClasses[incident.outcome],
					"px-4 py-2 rounded-md mt-2 flex relative ",
					props.className,
				)}
			>
				<div className="flex-auto overflow-hidden">
					<div className="text-sm whitespace-nowrap">
						<div className="flex items-center gap-x-1">
							<IncidentHighlights incident={incident} />
						</div>
					</div>
					<p>
						{incident.notes}
						{import.meta.env.DEV ? (
							<span className="font-mono text-sm">{incident.id}</span>
						) : null}
					</p>
				</div>
				<div className="w-5 absolute right-2 h-full top-0 flex items-center">
					<EllipsisVerticalIcon height={20} className="text-zinc-950/80 h-5" />
				</div>
			</MenuButton>
		</>
	);
};

export type IncidentMenuProps = {
	incident: IncidentData;
	readonly?: boolean;
	setEditIncidentOpen?: React.Dispatch<React.SetStateAction<boolean>>;
} & React.HTMLProps<HTMLDivElement>;

export const IncidentMenu: React.FC<IncidentMenuProps> = ({
	incident,
	readonly,
	setEditIncidentOpen,
	...props
}) => {
	const { data: event } = useCurrentEvent();
	const { data: team } = useEventTeam(event, incident.team);

	const { data: rules } = useRulesForEvent(event);

	const contactName = usePeerUserName(incident.consistency.outcome.peer);
	const date = new Date(incident.consistency.outcome.instant);

	return (
		<div {...props}>
			<div className="overflow-y-auto max-h-[60vh]">
				<div className="flex items-center gap-x-1 justify-between">
					{contactName ? (
						<span className="flex items-center gap-1">
							<UserCircleIcon height={20} />
							<span className="inline">{contactName}</span>
						</span>
					) : (
						<span></span>
					)}
					<span className="text-zinc-400">
						{date.toLocaleDateString(undefined, {
							month: "2-digit",
							day: "2-digit",
							year: "2-digit",
						})}
						{" • "}
						{date.toLocaleTimeString(undefined, {
							hour: "2-digit",
							minute: "2-digit",
						})}
					</span>
				</div>
				<h2 className="mt-2">
					<span className="text-emerald-400 font-mono">{incident.team}</span>
					{" • "}
					<span>{team?.team_name}</span>
				</h2>
				<div className="py-2 flex gap-x-2">
					<span
						className={twMerge(
							IncidentOutcomeBackgroundClasses[incident.outcome],
							"p-1 rounded-md px-2",
						)}
					>
						{incident.outcome}
					</span>
					<span className="p-1 rounded-md px-2 bg-zinc-300 text-zinc-900">
						{incident.match ? matchToString(incident.match) : "Non-Match"}
					</span>
				</div>
				<div>{incident.notes}</div>
				<div className="grid grid-cols-4 gap-4 mt-2">
					{incident.assets.map((asset) => (
						<AssetPreview key={asset} asset={asset} />
					))}
				</div>
				<div className="mt-4">
					{incident.rules
						.map((rule) => rules?.rulesLookup?.[rule])
						.map((rule) =>
							rule ? (
								<RulesDisplay key={rule.rule} rule={rule} className="mt-4" />
							) : null,
						)}
				</div>
				<div className="mt-4">
					{incident.flags?.includes("judge") ? (
						<Warning message="Flagged for Judging" />
					) : null}
				</div>
			</div>
			{readonly ? null : (
				<Button
					mode="primary"
					onClick={() => setEditIncidentOpen?.(true)}
					className="w-full mt-4"
				>
					Edit + Delete
				</Button>
			)}
			{props.children}
		</div>
	);
};
