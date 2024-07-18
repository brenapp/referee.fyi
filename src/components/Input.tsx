import { twMerge } from "tailwind-merge";
import { Game, Rule } from "~utils/hooks/rules";
import React, { Dispatch, useCallback, useMemo } from "react";
import { IconButton } from "./Button";
import { TrashIcon } from "@heroicons/react/24/outline";

export type CheckboxBinding = {
  value: boolean;
  onChange: Dispatch<boolean>;
};

export type CheckboxProps = React.HTMLProps<HTMLInputElement> & {
  label: string;
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
        labelProps?.className
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

export type RadioBinding<T> = {
  variant: T;
  value: T;
  onChange: Dispatch<T>;
};

export type RadioProps<T extends string | number | symbol> =
  React.HTMLProps<HTMLInputElement> & {
    label: string;
    labelProps?: React.HTMLProps<HTMLLabelElement>;
    bind?: RadioBinding<T>;
  };

export const Radio = <T extends string | number | symbol>({
  labelProps,
  label,
  bind,
  ...props
}: RadioProps<T>) => {
  const bindProps: React.HTMLProps<HTMLInputElement> = bind
    ? {
        checked: bind.value === bind.variant,
        onChange: (e) => {
          bind.onChange(bind.variant);
          props.onChange?.(e);
        },
      }
    : {};
  return (
    <label
      {...labelProps}
      className={twMerge(
        `bg-zinc-700 rounded-md p-2 flex gap-2 items-center`,
        "has-[:checked]:bg-emerald-800",
        labelProps?.className
      )}
    >
      <input
        {...props}
        {...bindProps}
        type="radio"
        className={twMerge("accent-emerald-400", props.className)}
      />
      <span>{label}</span>
    </label>
  );
};

export type InputBaseProps = React.HTMLProps<HTMLInputElement>;

export type InputBiding = {
  value: string;
  onChange: Dispatch<string>;
};

export type InputProps = InputBaseProps & { bind?: InputBiding };

export const Input: React.FC<InputProps> = ({ bind, ...props }) => {
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
  value: rules,
  onChange,
}) => {
  const value = useMemo(() => rules.map((r) => r.rule), [rules]);

  const onPickRule = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const rules: Rule[] = [];

      for (let i = 0; i < e.currentTarget.selectedOptions.length; i++) {
        const option = e.currentTarget.selectedOptions[i];
        const group = option.dataset.rulegroup;

        const rule = game?.ruleGroups
          .find((g) => g.name === group)
          ?.rules.find((r) => r.rule === option.value);

        if (!rule) continue;
        rules.push(rule);
      }

      onChange(rules);
    },
    [onChange, game]
  );

  const onRemoveRule = useCallback(
    (rule: Rule) => {
      onChange(rules.filter((r) => r.rule !== rule.rule));
    },
    [rules, onChange]
  );

  return (
    <>
      <Select
        className="max-w-full w-full mt-2"
        multiple
        value={value}
        onChange={onPickRule}
      >
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
        {rules.map((rule) => (
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
