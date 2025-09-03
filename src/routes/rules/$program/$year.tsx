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
  UserCircleIcon,
} from "@heroicons/react/24/solid";
import { useMemo, useState } from "react";
import { getUpdatedQuestionsForProgram } from "~utils/data/qna";
import { ProgramAbbr, programs, Year, years } from "robotevents";
import { useQuestionsForProgram } from "~utils/hooks/qna";
import { Schemas } from "~types/worker/rules";
import { MenuButton } from "~components/MenuButton";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/20/solid";

type Question = Schemas["Question"];

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

export type QuestionMenuProps = {
  question: Question;
} & React.HTMLProps<HTMLDivElement>;

export const QuestionMenu: React.FC<QuestionMenuProps> = ({
  question,
  ...props
}) => {
  return (
    <div {...props}>
      <div className="overflow-y-auto max-h-[60vh]">
        <h1 className="font-bold text-lg">{question.title}</h1>
        <div className="flex items-center gap-x-1 justify-between mt-4">
          <span className="flex items-center gap-1">
            <UserCircleIcon height={20} />
            <span className="inline">{question.author}</span>
          </span>

          <span className="text-zinc-400">
            {new Date(question.askedTimestamp).toLocaleDateString(undefined, {
              month: "2-digit",
              day: "2-digit",
              year: "2-digit",
            })}
          </span>
        </div>
        {question.answeredTimestamp ? (
          <p className="mt-4">
            Answered on{" "}
            {new Date(question.answeredTimestamp).toLocaleDateString(
              undefined,
              {
                month: "2-digit",
                day: "2-digit",
                year: "2-digit",
              }
            )}
          </p>
        ) : null}
        <article className="mt-4">
          <section
            className="qna-content"
            dangerouslySetInnerHTML={{ __html: question.questionRaw }}
          ></section>
        </article>
        {question.answered ? (
          <section className="mt-4">
            <h2 className="text-emerald-400 font-bold">Answer by Committee</h2>
            <section
              className="mt-2 qna-content "
              dangerouslySetInnerHTML={{ __html: question.answerRaw ?? "" }}
            ></section>
          </section>
        ) : null}
      </div>
      <ExternalLinkButton
        href={question.url}
        className="mt-2 w-full text-center flex items-center gap-4 justify-center text-emerald-400"
      >
        Official Question
        <ArrowTopRightOnSquareIcon height={20} />
      </ExternalLinkButton>
    </div>
  );
};

export type QuestionItemProps = {
  question: Question;
};

export const QuestionItem: React.FC<QuestionItemProps> = ({ question }) => {
  return (
    <MenuButton
      className="w-full mt-2 text-left"
      menu={<QuestionMenu question={question} />}
    >
      <span className="text-sm">
        {question.answered ? (
          <strong className="text-emerald-400">Answered</strong>
        ) : (
          <strong>Unanswered</strong>
        )}
        {question.tags.length > 0 ? " • " : ""}
        <span className="font-mono">{question.tags.join(", ")}</span>
      </span>
      <p className="font-normal">{question.title}</p>
    </MenuButton>
  );
};

export type QuestionListProps = {
  questions: Question[];
  query?: string;
};

function questionMatchesQuery(question: Question, query: string) {
  return (
    question.title.toLowerCase().includes(query.toLowerCase()) ||
    question.id.toLowerCase().includes(query.toLowerCase()) ||
    question.author.toLowerCase().includes(query.toLowerCase()) ||
    question.questionRaw.toLowerCase().includes(query.toLowerCase()) ||
    (question.answerRaw?.toLowerCase().includes(query.toLowerCase()) ??
      false) ||
    question.tags.some((tag) => tag.toLowerCase().includes(query.toLowerCase()))
  );
}

export const QuestionList: React.FC<QuestionListProps> = ({
  questions,
  query,
}) => {
  const filtered = useMemo(
    () =>
      query
        ? questions.filter((q) => questionMatchesQuery(q, query))
        : questions,
    [questions, query]
  );

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
  const { data: questionsFallback } = useQuestionsForProgram(
    program,
    year,
    true
  );

  return (
    <Await
      promise={questions}
      fallback={
        <QuestionList questions={questionsFallback ?? []} query={query} />
      }
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
        <nav className="sticky top-0 z-10 bg-zinc-800 py-2">
          <h1 className="font-bold text-lg">
            <span className="">{rules.title} Rules Reference</span>
            <span className="text-sm text-zinc-500 font-mono font-normal ml-2">
              {program} {rules.season}
            </span>
          </h1>
        </nav>
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
