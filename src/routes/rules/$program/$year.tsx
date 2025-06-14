import { createFileRoute, redirect } from "@tanstack/react-router";
import { YearSchema, ProgramAbbrSchema, Game } from "@referee-fyi/rules";
import { queryClient } from "~utils/data/query";
import { getUseRulesForSeasonQueryParams } from "~utils/hooks/rules";
import { LinkButton } from "~components/Button";
import { IconLabel, Input } from "~components/Input";
import { MagnifyingGlassIcon } from "@heroicons/react/24/solid";
import { useState } from "react";

type RuleGroupProps = {
  ruleGroup: Game["ruleGroups"][number];
  query?: string;
};

const RuleGroup: React.FC<RuleGroupProps> = ({ ruleGroup, query }) => {
  const rules = ruleGroup.rules.filter((rule) => {
    return query
      ? rule.description.toLowerCase().includes(query.toLowerCase())
      : true;
  });

  if (rules.length < 1) {
    return null;
  }

  return (
    <section>
      <h2 className="font-bold">{ruleGroup.name}</h2>
      <ol>
        {rules.map((rule) => (
          <li key={rule.rule} className="mb-2">
            <LinkButton from="/rules/$program/$year" className="w-full mt-2">
              <strong className="text-sm font-mono text-emerald-400">
                {rule.rule}
              </strong>
              <p className="font-normal">{rule.description}</p>
            </LinkButton>
          </li>
        ))}
      </ol>
    </section>
  );
};

export const RulebookPage: React.FC = () => {
  const [query, setQuery] = useState("");
  const { rules, program } = Route.useLoaderData();

  const groups = rules.ruleGroups.filter((group) =>
    group.programs.includes(program)
  );

  return (
    <main className="mt-4 flex flex-col gap-4 max-h-screen">
      <section className="overflow-auto flex-1">
        <h1 className="font-bold text-lg">
          {rules.title} •{" "}
          <span className="font-normal font-mono text-sm text-emerald-400">
            {program} {rules.season}
          </span>
        </h1>
        <div className="mt-4">
          {groups.map((group) => (
            <RuleGroup key={group.name} ruleGroup={group} query={query} />
          ))}
        </div>
      </section>
      <nav>
        <IconLabel icon={<MagnifyingGlassIcon height={24} />}>
          <Input
            placeholder="Search rules and Q&As..."
            className="flex-1"
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
          />
        </IconLabel>
      </nav>
    </main>
  );
};

export const Route = createFileRoute("/rules/$program/$year")({
  component: RulebookPage,
  loader: async ({ params }) => {
    const program = ProgramAbbrSchema.safeParse(params.program);
    const year = YearSchema.safeParse(params.year);

    if (!program.success || !year.success) {
      throw redirect({ to: "/", from: "/rules/$program/$year" });
    }

    const rules = await queryClient.ensureQueryData(
      getUseRulesForSeasonQueryParams(program.data, year.data)
    );

    if (!rules) {
      throw redirect({ to: "/", from: "/rules/$program/$year" });
    }

    return {
      program: program.data,
      year: year.data,
      rules,
    };
  },
});
