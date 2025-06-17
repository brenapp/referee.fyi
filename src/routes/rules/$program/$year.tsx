import { Await, createFileRoute, redirect } from "@tanstack/react-router";
import { Game } from "@referee-fyi/rules";
import { queryClient } from "~utils/data/query";
import { getUseRulesForSeasonQueryParams } from "~utils/hooks/rules";
import { ExternalLinkButton } from "~components/Button";
import { IconLabel, Input } from "~components/Input";
import {
  MagnifyingGlassIcon,
  BookOpenIcon,
  ChatBubbleLeftRightIcon,
} from "@heroicons/react/24/solid";
import { useState } from "react";
import { getUpdatedQuestionsForProgram } from "~utils/data/qna";
import { Spinner } from "~components/Spinner";
import type { Question } from "@referee-fyi/rules/worker";
import { ProgramAbbr, programs, Year, years } from "robotevents";

type RuleGroupProps = {
  ruleGroup: Game["ruleGroups"][number];
  query?: string;
};

const RuleGroup: React.FC<RuleGroupProps> = ({ ruleGroup, query }) => {
  const rules = ruleGroup.rules.filter((rule) => {
    return query
      ? rule.description.toLowerCase().includes(query.toLowerCase()) ||
          rule.rule.toLowerCase().includes(query.toLowerCase()) ||
          ruleGroup.name.toLowerCase().includes(query.toLowerCase())
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
            <ExternalLinkButton href={rule.link} className="w-full mt-2">
              <strong className="text-sm font-mono text-emerald-400">
                {rule.rule}
              </strong>
              <p className="font-normal">{rule.description}</p>
            </ExternalLinkButton>
          </li>
        ))}
      </ol>
    </section>
  );
};

export type QuestionItemProps = {
  question: Question;
};

export const QuestionItem: React.FC<QuestionItemProps> = ({ question }) => {
  return (
    <ExternalLinkButton href={question.url} className="w-full mt-2">
      <strong className="text-sm font-mono text-emerald-400">
        {question.id}
      </strong>
      <p className="font-normal">{question.title}</p>
    </ExternalLinkButton>
  );
};

export type QuestionListProps = {
  questions: Question[];
  query?: string;
};

export const QuestionList: React.FC<QuestionListProps> = ({
  questions,
  query,
}) => {
  const filtered = query
    ? questions.filter(
        (q) =>
          q.title.toLowerCase().includes(query.toLowerCase()) ||
          q.id.toLowerCase().includes(query.toLowerCase())
      )
    : questions;

  if (filtered.length === 0) {
    return null;
  }

  return (
    <section>
      <h2 className="font-bold">Q&amp;A</h2>
      <ol>
        {filtered.map((question) => (
          <li key={question.id} className="mb-2">
            <QuestionItem question={question} />
          </li>
        ))}
      </ol>
    </section>
  );
};

export type QuestionGroupProps = {
  query: string;
};

export const QuestionGroup: React.FC<QuestionGroupProps> = ({ query }) => {
  const { questions } = Route.useLoaderData();

  return (
    <Await promise={questions} fallback={<Spinner show />}>
      {(questions) => <QuestionList questions={questions} query={query} />}
    </Await>
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
        <h1 className="font-bold text-lg">{rules.title} Rules Reference</h1>
        <nav className="mt-2">
          <ExternalLinkButton
            href={rules.links.manual}
            className="mr-4 inline-flex gap-4 items-center"
          >
            <BookOpenIcon height={20} />
            Official Manual
          </ExternalLinkButton>
          <ExternalLinkButton
            href={rules.links.qna}
            className="mr-4 inline-flex gap-4 items-center"
          >
            <ChatBubbleLeftRightIcon height={20} />
            Official Q&A
          </ExternalLinkButton>
        </nav>
        <div className="mt-4">
          {groups.map((group) => (
            <RuleGroup key={group.name} ruleGroup={group} query={query} />
          ))}
        </div>
        <QuestionGroup query={query} />
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

function parseParams(program: string, year: string) {
  return {
    program: Object.keys(programs).includes(program)
      ? (program as ProgramAbbr)
      : null,
    year: years.includes(year as Year) ? (year as Year) : null,
  };
}

export const Route = createFileRoute("/rules/$program/$year")({
  component: RulebookPage,
  loader: async ({ params }) => {
    const { program, year } = parseParams(params.program, params.year);

    if (!program || !year) {
      throw redirect({ to: "/", from: "/rules/$program/$year" });
    }

    const rules = await queryClient.ensureQueryData(
      getUseRulesForSeasonQueryParams(program, year)
    );

    if (!rules) {
      throw redirect({ to: "/", from: "/rules/$program/$year" });
    }

    return {
      program: program,
      year: year,
      rules,
      questions: getUpdatedQuestionsForProgram(program, year),
    };
  },
});
