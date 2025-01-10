import { twMerge } from "tailwind-merge";
import { Game, Rule } from "~utils/hooks/rules";
import React, {
  Dispatch,
  forwardRef,
  SetStateAction,
  useCallback,
  useId,
  useMemo,
} from "react";
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
    [bind, checked]
  );

  return (
    <div
      {...props}
      className={twMerge(
        "h-10 flex items-center flex-1 bg-zinc-700 rounded-md px-2 gap-2 data-[selected=true]:bg-emerald-800",
        props.className
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
          props.className
        )}
      />
    );
  }
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
          props.className
        )}
      />
    );
  }
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
        props.className
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
                <div className="flex items-center gap-x-1">
                  <div>{rule.rule}</div>
                  {rule.icon && (
                    <div className="flex items-center justify-center w-6 h-">
                      <img
                        src={rule.icon}
                        alt={`Icon`}
                        className="max-h-6 max-w-6 object-contain"
                      />
                    </div>
                  )}
                  <div>{rule.description}</div>
                </div>
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
              <div className="flex items-center gap-x-1">
                <strong className="font-mono mr-2">{rule.rule}</strong>
                {rule.icon && (
                  <img
                    src={rule.icon}
                    alt={`Icon`}
                    className="max-h-6 w-auto"
                  />
                )}
              </div>
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
