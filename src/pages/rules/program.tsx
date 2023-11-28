import { useCallback, useRef, useState } from "react";
import { Rule, useRulesForProgram } from "../../utils/hooks/robotevents";
import { Select } from "../../components/Input";
import { Navigate, useParams } from "react-router-dom";
import { ProgramAbbr } from "robotevents/out/endpoints/programs";

export const RulesProgramPage: React.FC = () => {
  const ref = useRef<HTMLIFrameElement>(null);
  const { program } = useParams<{ program: ProgramAbbr }>();
  const gameRules = useRulesForProgram(program!);

  if (!gameRules) {
    return <Navigate to="/rules" />;
  }

  const [rule, setRule] = useState<Rule | null>(null);

  const onChangeRule = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const group = e.target.selectedOptions[0].dataset.rulegroup;
      if (!group) return;

      const rule = gameRules.ruleGroups
        .find((g) => g.name === group)
        ?.rules.find((r) => r.rule === e.target.value);

      if (!rule) return;
      setRule(rule);
    },
    []
  );

  return (
    <section className="mt-4">
      <Select
        className="w-full py-4"
        value={rule?.rule}
        onChange={onChangeRule}
      >
        <option>Pick A Rule</option>
        {gameRules.ruleGroups.map((group) => (
          <optgroup label={group.name} key={group.name}>
            {group.rules.map((rule) => (
              <option
                value={rule.rule}
                data-rulegroup={group.name}
                key={rule.rule}
              >
                {rule.rule}
              </option>
            ))}
          </optgroup>
        ))}
      </Select>
      <div className="h-full bg-zinc-100 rounded-md mt-4">
        <iframe
          ref={ref}
          src={rule?.link ?? "about:blank"}
          className="w-full h-full"
        ></iframe>
      </div>
    </section>
  );
};
