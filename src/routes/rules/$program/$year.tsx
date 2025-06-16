import { Await, createFileRoute, redirect } from "@tanstack/react-router";
import { YearSchema, ProgramAbbrSchema, Game } from "@referee-fyi/rules";
import { queryClient } from "~utils/data/query";
import { getUseRulesForSeasonQueryParams } from "~utils/hooks/rules";
import { ExternalLinkButton, LinkButton } from "~components/Button";
import { IconLabel, Input } from "~components/Input";
import {
  MagnifyingGlassIcon,
  BookOpenIcon,
  ChatBubbleLeftRightIcon,
} from "@heroicons/react/24/solid";
import { useState } from "react";
import { getUpdatedQuestionsForProgram } from "~utils/data/qna";
import { useQuestionsForProgram } from "~utils/hooks/qna";
import { Question } from "@referee-fyi/rules/qnaplus";

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

export type QuestionItemProps = {
  question: Question;
};

export const QuestionItem: React.FC<QuestionItemProps> = ({ question }) => {
  return (
    <LinkButton className="w-full mt-2">
      <strong className="text-sm font-mono text-emerald-400">
        {question.id}
      </strong>
      <p className="font-normal">{question.title}</p>
    </LinkButton>
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
  const { questions, year, program } = Route.useLoaderData();
  const { data: questionsFallback } = useQuestionsForProgram(program, year);

  return (
    <Await
      promise={questions}
      fallback={<QuestionList questions={questionsFallback ?? []} />}
    >
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
      questions: getUpdatedQuestionsForProgram(program.data, year.data),
    };
  },
});
