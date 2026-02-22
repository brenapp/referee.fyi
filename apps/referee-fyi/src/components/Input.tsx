import { TrashIcon } from "@heroicons/react/24/outline";
import type React from "react";
import {
	type Dispatch,
	forwardRef,
	type ReactNode,
	type SetStateAction,
	useCallback,
	useId,
	useMemo,
	useState,
} from "react";
import { twMerge } from "tailwind-merge";
import type { LocalAsset } from "~utils/data/assets";
import { isRuleMatch, sortRuleGroups } from "~utils/data/rules";
import type { Game, Rule } from "~utils/hooks/rules";
import { Button, IconButton } from "./Button";
import { MenuButton } from "./MenuButton";

export type CheckboxBinding = {
	value: boolean;
	onChange: Dispatch<boolean>;
};

export type CheckboxProps = Omit<React.HTMLProps<HTMLInputElement>, "label"> & {
	label: React.ReactNode;
	labelProps?: React.HTMLProps<HTMLLabelElement>;
	bind?: CheckboxBinding;
};
export const Checkbox: React.FC<CheckboxProps> = ({
	label,
	labelProps,
	bind,
	...props
}) => {
	const bindProps: React.HTMLProps<HTMLInputElement> = bind
		? {
				checked: bind.value,
				onChange: (e) => {
					bind.onChange(e.currentTarget.checked);
					props.onChange?.(e);
				},
			}
		: {};

	return (
		<label
			{...labelProps}
			className={twMerge(
				"flex mt-4 gap-2 bg-zinc-700 p-2 rounded-md items-center",
				"has-[:checked]:bg-emerald-800",
				labelProps?.className,
			)}
		>
			<input
				{...props}
				{...bindProps}
				type="checkbox"
				className={twMerge("accent-emerald-400", props.className)}
			/>
			<span>{label}</span>
		</label>
	);
};

export const RadioButton: React.FC<{ checked: boolean; fill: string }> = ({
	checked,
	fill,
}) => {
	return (
		<svg
			width="14"
			height="14"
			viewBox="0 0 14 14"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
		>
			<circle cx="7" cy="7" r="6.5" stroke={fill} />
			{checked ? <circle cx="7" cy="7" r="4" fill={fill} /> : null}
		</svg>
	);
};
export type RadioBinding<T> = {
	variant: T;
	value: T;
	onChange: Dispatch<T>;
};

export type RadioProps<T extends string | number | symbol> =
	React.HTMLProps<HTMLDivElement> & {
		label: string;
		labelProps?: React.HTMLProps<HTMLSpanElement>;
		bind: RadioBinding<T>;
	};

export const Radio = <T extends string | number | symbol>({
	labelProps,
	label,
	bind,
	...props
}: RadioProps<T>) => {
	const id = useId();

	const checked = bind.value === bind.variant;

	const onPointerUp = useCallback(() => {
		bind.onChange(bind.variant);
	}, [bind]);

	const onKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			const selectKey = e.key === "Enter" || e.key === " ";
			if (selectKey && !checked) {
				bind.onChange(bind.variant);
			}
		},
		[bind, checked],
	);

	return (
		<div
			{...props}
			className={twMerge(
				"h-10 flex items-center flex-1 bg-zinc-700 rounded-md px-2 gap-2 data-[selected=true]:bg-emerald-800",
				props.className,
			)}
			role="radio"
			aria-checked={checked}
			data-selected={checked}
			aria-labelledby={id}
			tabIndex={0}
			onPointerUp={onPointerUp}
			onKeyDown={onKeyDown}
		>
			<RadioButton checked={checked} fill="currentColor" />
			<span id={id} {...labelProps}>
				{label}
			</span>
		</div>
	);
};

export type InputBaseProps = React.HTMLProps<HTMLInputElement>;

export type InputBiding = {
	value: string;
	onChange: Dispatch<string>;
};

export type InputProps = InputBaseProps & { bind?: InputBiding };

export const Input = forwardRef<HTMLInputElement, InputProps>(
	({ bind, ...props }, ref) => {
		const bindProps: React.HTMLProps<HTMLInputElement> = bind
			? {
					value: bind.value,
					onChange: (e) => {
						bind.onChange(bind.value);
						props.onChange?.(e);
					},
				}
			: {};
		return (
			<input
				{...props}
				{...bindProps}
				{...(ref ? { ref } : {})}
				className={twMerge(
					"rounded-md bg-zinc-700 text-zinc-100 text-left px-3 py-2",
					"hover:bg-zinc-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-500",
					props.className,
				)}
			/>
		);
	},
);

export type TextAreaBaseProps = React.HTMLProps<HTMLTextAreaElement>;

export type TextAreaProps = TextAreaBaseProps & { bind?: InputBiding };

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
	({ bind, ...props }, ref) => {
		const bindProps: React.HTMLProps<HTMLTextAreaElement> = bind
			? {
					value: bind.value,
					onChange: (e) => {
						bind.onChange(bind.value);
						props.onChange?.(e);
					},
				}
			: {};
		return (
			<textarea
				{...props}
				{...bindProps}
				{...(ref ? { ref } : {})}
				className={twMerge(
					"rounded-md bg-zinc-700 text-zinc-100 text-left px-3 py-2",
					"hover:bg-zinc-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-500",
					props.className,
				)}
			/>
		);
	},
);

export type SelectBaseProps = React.DetailedHTMLProps<
	React.InputHTMLAttributes<HTMLSelectElement>,
	HTMLSelectElement
>;

export type SelectBinding<T extends string> = {
	value: T;
	onChange: Dispatch<SetStateAction<T>>;
};

export type SelectProps<T extends string> = SelectBaseProps & {
	bind?: SelectBinding<T>;
};

export const Select = <T extends string>({
	children,
	bind,
	...props
}: SelectProps<T>) => {
	const bindProps: SelectBaseProps = bind
		? {
				value: bind.value,
				onChange: (e) => {
					bind.onChange(e.currentTarget.value as T);
					props.onChange?.(e);
				},
			}
		: {};
	return (
		<select
			{...props}
			{...bindProps}
			className={twMerge(
				"rounded-md bg-zinc-700 text-zinc-100 text-left px-3 py-2",
				"hover:bg-zinc-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-500",
				props.className,
			)}
		>
			{children}
		</select>
	);
};

export type RulesSelectProps = SelectBaseProps & {
	game?: Game | null;
	rule: Rule | null;
	setRule: (rule: Rule | null) => void;
};

export const RulesSelect: React.FC<RulesSelectProps> = ({
	game,
	rule,
	setRule,
	...props
}) => {
	const onChangeRule = useCallback(
		(e: React.ChangeEvent<HTMLSelectElement>) => {
			const group = e.target.selectedOptions[0].dataset.rulegroup;
			if (!group) return;

			const rule = game?.ruleGroups
				.find((g) => g.name === group)
				?.rules.find((r) => r.rule === e.target.value);

			if (!rule) return;
			setRule(rule);
		},
		[game, setRule],
	);

	return (
		<Select
			className="w-full py-4"
			value={rule?.rule}
			onChange={onChangeRule}
			{...props}
		>
			<option>Pick A Rule</option>
			{game?.ruleGroups.map((group) => (
				<optgroup label={group.name} key={game.title + group.name}>
					{group.rules.map((rule) => (
						<option
							value={rule.rule}
							data-rulegroup={group.name}
							key={game.title + rule.rule}
						>
							{rule.rule}
						</option>
					))}
				</optgroup>
			))}
		</Select>
	);
};

export type RulesDisplayProps = React.PropsWithChildren<{
	rule: Rule;
}> &
	React.HTMLProps<HTMLDivElement>;

export const RulesDisplay: React.FC<RulesDisplayProps> = ({
	rule,
	...props
}) => (
	<div
		{...props}
		className={twMerge("p-2 w-full bg-zinc-800 rounded-md", props.className)}
	>
		<div className="flex items-center gap-x-1">
			<strong className="font-mono mr-2">{rule.rule}</strong>
			{rule.icon && (
				<img src={rule.icon} alt="Icon" className="max-h-6 w-auto" />
			)}
		</div>
		<span>{rule.description}</span>
	</div>
);

export type RulesDisplayMenuProps = {
	game: Game;
	value: Rule[];
	onChange: (rules: Rule[]) => void;
};

export const RulesDisplayMenu: React.FC<RulesDisplayMenuProps> = ({
	game,
	value: selected,
	onChange,
}) => {
	const [query, setQuery] = useState("");

	return (
		<>
			<fieldset
				className="max-h-[80svh] max-w-[100svw] overflow-y-auto"
				aria-label="Select rules"
			>
				{game.ruleGroups.toSorted(sortRuleGroups).map((group) => {
					const selectedRuleSet = new Set(selected.map((r) => r.rule));

					return (
						<div key={group.name} className="mb-4">
							<h3 className="font-bold">{group.name}</h3>
							{group.rules
								.filter((rule) => isRuleMatch(group, rule, query))
								.map((rule) => (
									<div>
										<Checkbox
											className="h-4 w-4 mt-[3px]"
											labelProps={{
												className: "p-2 mt-1 bg-transparent",
											}}
											bind={{
												value: selectedRuleSet.has(rule.rule),
												onChange: (checked) => {
													if (checked) {
														onChange([...selected, rule]);
													} else {
														onChange(
															selected.filter((r) => r.rule !== rule.rule),
														);
													}
												},
											}}
											label={
												<p>
													<span className="text-sm font-mono mr-1 font-bold text-emerald-400">
														{rule.rule}
													</span>
													{rule.description}
												</p>
											}
										/>
									</div>
								))}
						</div>
					);
				})}
			</fieldset>
			<div>
				<Input
					placeholder="Search rule..."
					aria-label="Search rules"
					value={query}
					onChange={(e) => setQuery(e.currentTarget.value)}
					className="w-full mt-4"
				/>
			</div>
		</>
	);
};

export type RulesMultiSelectProps = {
	game: Game;
	value: Rule[];
	onChange: (rules: Rule[]) => void;
};

export const RulesMultiSelect: React.FC<RulesMultiSelectProps> = ({
	game,
	value: rules,
	onChange,
}) => {
	const value = useMemo(() => rules.map((r) => r.rule), [rules]);
	const onRemoveRule = useCallback(
		(rule: Rule) => {
			onChange(rules.filter((r) => r.rule !== rule.rule));
		},
		[rules, onChange],
	);

	return (
		<>
			<MenuButton
				menu={
					<RulesDisplayMenu game={game} value={rules} onChange={onChange} />
				}
				menuProps={{
					persistence: {
						type: "persistent",
						closer: ({ close }) => (
							<section className="mt-2">
								<Button
									onClick={(e) => {
										e.preventDefault();
										e.stopPropagation();
										close();
									}}
								>
									Confirm
								</Button>
							</section>
						),
					},
				}}
			>
				{value.length > 0
					? `${value.length} Rule${value.length > 1 ? "s" : ""} Selected`
					: "Pick Rules"}
			</MenuButton>
			<ul className="mt-4 flex flex-wrap gap-2">
				{rules
					.filter((rule) => rule)
					.map((rule) => (
						<li
							key={rule.rule}
							className="p-2 flex w-full items-center bg-zinc-800 rounded-md"
						>
							<RulesDisplay rule={rule} className="flex-1 mr-1 p-0" />
							<IconButton
								className="bg-transparent"
								icon={<TrashIcon height={24} />}
								onClick={() => onRemoveRule(rule)}
							></IconButton>
						</li>
					))}
			</ul>
		</>
	);
};

export type LabelSymbolProps = React.HTMLProps<HTMLLabelElement> & {
	icon: ReactNode;
};

export const IconLabel: React.FC<LabelSymbolProps> = ({
	icon,
	children,
	...props
}) => {
	return (
		<label
			{...props}
			className={twMerge(
				"flex items-center gap-4 bg-zinc-700 pl-2 rounded-md",
				props.className,
			)}
		>
			{icon}
			{children}
		</label>
	);
};

export type AssetPickerProps = Omit<
	React.HTMLProps<HTMLInputElement>,
	"onChange" | "multiple" | "value"
> & {
	onPick?: (buffer: LocalAsset) => void;
	readonly fields: Omit<LocalAsset, "data" | "id">;
};

export const AssetPicker: React.FC<AssetPickerProps> = ({
	onPick,
	fields,
	...props
}) => {
	const onChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const blob = e.target.files?.[0];
			if (!blob) return;

			const asset: LocalAsset = {
				id: crypto.randomUUID(),
				data: blob,
				...fields,
			};

			onPick?.(asset);
		},
		[fields, onPick],
	);
	return (
		<input
			type="file"
			{...props}
			className={twMerge("sr-only", props.className)}
			onChange={onChange}
		/>
	);
};
