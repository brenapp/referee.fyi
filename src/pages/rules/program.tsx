import { useRef, useState } from "react";
import { Rule, useRulesForProgram } from "../../utils/hooks/robotevents";
import { RulesSelect } from "../../components/Input";
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

  return (
    <section className="mt-4">
      <RulesSelect game={gameRules} rule={rule} setRule={setRule} />
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
