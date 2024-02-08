import { twMerge } from "tailwind-merge";
import { Game, Rule } from "~utils/hooks/rules";
import { useCallback } from "react";
import { IconButton } from "./Button";
import { TrashIcon } from "@heroicons/react/24/outline";

export type InputBaseProps = React.HTMLProps<HTMLInputElement>;

export type InputProps = InputBaseProps;

export const Input: React.FC<InputProps> = (props) => {
  return (
    <input
      {...props}
      className={twMerge(
        "rounded-md bg-zinc-700 text-zinc-100 text-left px-3 py-2",
        "hover:bg-zinc-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-500",
        props.className
      )}
    />
  );
};

export type TextAreaBaseProps = React.HTMLProps<HTMLTextAreaElement>;

export type TextAreaProps = TextAreaBaseProps;

export const TextArea: React.FC<TextAreaProps> = (props) => {
  return (
    <textarea
      {...props}
      className={twMerge(
        "rounded-md bg-zinc-700 text-zinc-100 text-left px-3 py-2",
        "hover:bg-zinc-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-500",
        props.className
      )}
    />
  );
};

export type SelectBaseProps = React.DetailedHTMLProps<
  React.InputHTMLAttributes<HTMLSelectElement>,
  HTMLSelectElement
>;

export type SelectProps = SelectBaseProps;

export const Select: React.FC<SelectBaseProps> = ({ children, ...props }) => {
  return (
    <select
      {...props}
      className={twMerge(
        "rounded-md bg-zinc-700 text-zinc-100 text-left px-3 py-2",
        "hover:bg-zinc-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-500",
        props.className
      )}
    >
      {children}
    </select>
  );
};

export type RulesSelectProps = SelectBaseProps & {
  game?: Game;
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
    [game, setRule]
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

export type RulesMultiSelectProps = {
  game: Game;
  value: Rule[];
  onChange: (rules: Rule[]) => void;
};

export const RulesMultiSelect: React.FC<RulesMultiSelectProps> = ({
  game,
  value,
  onChange,
}) => {
  const onPickOtherRule = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const group = e.target.selectedOptions[0].dataset.rulegroup;
      if (!group) return;

      const rule = game?.ruleGroups
        .find((g) => g.name === group)
        ?.rules.find((r) => r.rule === e.target.value);

      if (!rule) return;
      if (value.some((r) => r.rule === rule.rule)) return;
      onChange([...value, rule]);
    },
    [game, value]
  );

  const onRemoveRule = useCallback(
    (rule: Rule) => {
      const rules = value.filter((r) => r.rule !== rule.rule);
      onChange(rules);
    },
    [value]
  );

  return (
    <>
      <Select
        className="max-w-full w-full mt-2"
        value={""}
        onChange={onPickOtherRule}
      >
        <option>Pick Rule</option>
        {game?.ruleGroups.map((group) => (
          <optgroup label={group.name} key={group.name}>
            {group.rules.map((rule) => (
              <option
                value={rule.rule}
                data-rulegroup={group.name}
                key={rule.rule}
              >
                {rule.rule} {rule.description}
              </option>
            ))}
          </optgroup>
        ))}
      </Select>
      <ul className="mt-4 flex flex-wrap gap-2">
        {value.map((rule) => (
          <li
            key={rule.rule}
            className="p-2 flex w-full items-center bg-zinc-800 rounded-md"
          >
            <p className="flex-1 mr-1">
              <strong className="font-mono mr-2">{rule.rule}</strong>
              <span>{rule.description}</span>
            </p>
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
