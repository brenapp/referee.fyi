import { m, AnimatePresence } from "motion/react";
import { createFileRoute } from "@tanstack/react-router";
import { getAllIncidents, Incident } from "~utils/data/incident";
import { getShareProfile } from "~utils/data/share";
import { IncidentOutcome, OUTCOMES } from "@referee-fyi/share";
import { twMerge } from "tailwind-merge";
import { LinkButton } from "~components/Button";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";

const OutcomeBackgroundClasses: Record<IncidentOutcome, string> = {
  Minor: "bg-yellow-400/20 border-yellow-400/50 text-yellow-300",
  Major: "bg-red-400/20 border-red-400/50 text-red-300",
  Disabled: "bg-blue-400/20 border-blue-400/50 text-blue-300",
  General: "bg-zinc-400/20 border-zinc-400/50 text-zinc-300",
  Inspection: "bg-zinc-400/20 border-zinc-400/50 text-zinc-300",
};

type OutcomeStats = Record<IncidentOutcome, number>;
type RuleStats = { rule: string; count: number }[];

function computeOutcomeStats(incidents: Incident[]): OutcomeStats {
  const stats: OutcomeStats = {
    General: 0,
    Minor: 0,
    Major: 0,
    Inspection: 0,
    Disabled: 0,
  };
  for (const incident of incidents) {
    stats[incident.outcome]++;
  }
  return stats;
}

function computeRuleStats(incidents: Incident[]): RuleStats {
  const ruleCounts: Record<string, number> = {};
  for (const incident of incidents) {
    for (const rule of incident.rules) {
      ruleCounts[rule] = (ruleCounts[rule] ?? 0) + 1;
    }
  }
  return Object.entries(ruleCounts)
    .map(([rule, count]) => ({ rule, count }))
    .sort((a, b) => b.count - a.count);
}

const OutcomeStatCard: React.FC<{
  outcome: IncidentOutcome;
  count: number;
  index: number;
}> = ({ outcome, count, index }) => {
  return (
    <m.div
      className={twMerge(
        "flex items-center justify-between px-4 py-3 rounded-lg border",
        OutcomeBackgroundClasses[outcome]
      )}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.8 + index * 0.1, duration: 0.5 }}
    >
      <span className="font-medium">{outcome}</span>
      <span className="font-mono font-bold text-lg">{count}</span>
    </m.div>
  );
};

const RuleStatRow: React.FC<{
  rule: string;
  count: number;
  maxCount: number;
  index: number;
}> = ({ rule, count, maxCount, index }) => {
  const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;

  return (
    <m.div
      className="relative overflow-hidden rounded-lg bg-zinc-700/50 border border-zinc-600/50"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.3 + index * 0.05, duration: 0.4 }}
    >
      <m.div
        className="absolute inset-y-0 left-0 bg-emerald-500/30"
        initial={{ width: 0 }}
        animate={{ width: `${percentage}%` }}
        transition={{
          delay: 1.5 + index * 0.05,
          duration: 0.6,
          ease: "easeOut",
        }}
      />
      <div className="relative flex items-center justify-between px-4 py-2">
        <span className="font-mono text-emerald-300">{rule}</span>
        <span className="font-mono text-zinc-300">{count}</span>
      </div>
    </m.div>
  );
};

export const One: React.FC = () => {
  const { authoredThisSeason, outcomeStats, ruleStats } = Route.useLoaderData();

  const topRules = ruleStats.slice(0, 10);
  const maxRuleCount = topRules[0]?.count ?? 0;

  return (
    <AnimatePresence>
      <div className="relative z-10 flex flex-col gap-6 px-6 pt-16 pb-8 w-full">
        <m.nav
          className="fixed top-0 left-0 right-0 z-20 flex justify-between items-center px-4 py-3"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <LinkButton
            to="/wrapped"
            className="flex items-center gap-1 bg-transparent hover:bg-zinc-700/50 px-2 py-1"
          >
            <ChevronLeftIcon className="w-5 h-5" />
            <span className="text-sm">Back</span>
          </LinkButton>
          <span className="text-zinc-500 text-sm">1 / 2</span>
          <LinkButton
            to="/wrapped/2025-2026/2"
            className="flex items-center gap-1 bg-emerald-600/80 hover:bg-emerald-500 px-2 py-1"
          >
            <span className="text-sm">Next</span>
            <ChevronRightIcon className="w-5 h-5" />
          </LinkButton>
        </m.nav>
        <m.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <m.h1
            className="text-4xl md:text-5xl font-bold text-white mb-2"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <span className="text-emerald-400">
              {authoredThisSeason.length}
            </span>{" "}
            Incidents
          </m.h1>
          <m.p
            className="text-zinc-200"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            Created this season
          </m.p>
        </m.div>
        <m.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          <m.h2
            className="text-lg font-semibold text-zinc-300 mb-3"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7, duration: 0.4 }}
          >
            By Outcome
          </m.h2>
          <div className="grid gap-2">
            {OUTCOMES.map((outcome, index) => (
              <OutcomeStatCard
                key={outcome}
                outcome={outcome}
                count={outcomeStats[outcome]}
                index={index}
              />
            ))}
          </div>
        </m.section>
        {topRules.length > 0 && (
          <m.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.5 }}
          >
            <m.h2
              className="text-lg font-semibold text-zinc-300 mb-3"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.25, duration: 0.4 }}
            >
              Top Rules Cited
            </m.h2>
            <div className="grid gap-2">
              {topRules.map((stat, index) => (
                <RuleStatRow
                  key={stat.rule}
                  rule={stat.rule}
                  count={stat.count}
                  maxCount={maxRuleCount}
                  index={index}
                />
              ))}
            </div>
          </m.section>
        )}
      </div>
    </AnimatePresence>
  );
};

export const Route = createFileRoute("/wrapped/2025-2026/1")({
  component: One,
  loader: async () => {
    const profile = await getShareProfile();
    const incidents = await getAllIncidents();

    const authored = incidents.filter(
      (i) => i.consistency.outcome.peer == profile.key
    );

    const seasonStartDate = new Date("2025-05-15T00:00:00.000Z");

    const authoredThisSeason = authored.filter((i) => {
      const incidentDate = new Date(i.time);
      return incidentDate >= seasonStartDate;
    });

    const outcomeStats = computeOutcomeStats(authoredThisSeason);
    const ruleStats = computeRuleStats(authoredThisSeason);

    return {
      authored,
      authoredThisSeason,
      outcomeStats,
      ruleStats,
    };
  },
});
