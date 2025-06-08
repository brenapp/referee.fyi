import { GameSchema } from "@referee-fyi/rules";
import { RulesIndexMetadata } from "./types";
import { ProgramAbbr, Year } from "robotevents";

// const GAMES = [
//   "https://referee.fyi/rules/V5RC/2024-2025.json",
//   "https://referee.fyi/rules/VIQRC/2024-2025.json",
// ];

function normalizeRule(rule: string): string {
  return rule.replace(/<|>/g, "").trim();
}

export type GameRuleToIndex = {
  path: `${ProgramAbbr}_${Year}/rule_${string}`;
  meta: RulesIndexMetadata;
  rule: string;
  url: string;
};

export async function getGameRulesToIndex(url: string) {
  const json = await fetch(url).then((res) => res.json());
  const result = GameSchema.safeParse(json);
  if (!result.success) {
    return { success: false, error: result.error } as const;
  }

  const rules: GameRuleToIndex[] = [];

  for (const group of result.data.ruleGroups) {
    for (const rule of group.rules) {
      const metadata: RulesIndexMetadata = {
        programs: group.programs,
        year: result.data.season,
        rule,
        group: group.name,
      };

      for (const program of group.programs) {
        rules.push({
          path: `${program}_${result.data.season}/rule_${normalizeRule(
            rule.rule
          )}`,
          meta: metadata,
          rule: rule.rule,
          url: rule.link,
        });
      }
    }
  }

  return { success: true, rules } as const;
}

export async function scheduled(
  event: ScheduledController,
  env: Env,
  ctx: ExecutionContext
) {
  console.log("Scheduled event triggered:", event.cron, env, ctx);

  const rules = await getGameRulesToIndex(
    "https://referee.fyi/rules/V5RC/2024-2025.json"
  );

  if (!rules.success) {
    console.error("Failed to fetch game rules:", rules.error);
    return;
  }

  const cache: Record<string, string> = {};

  for (const rule of rules.rules) {
    let html = "";

    if (cache[rule.url]) {
      html = cache[rule.url];
    } else {
      html = await fetch(rule.url).then((res) => res.text());
    }
    cache[rule.url] = html;

    console.log("Fetched rule HTML for", rule.rule, "from", rule.url);

    const put = await env.RULES_BUCKET.put(rule.path, html, {
      httpMetadata: {
        contentType: "text/html",
        cacheControl: "max-age=31536000, immutable",
      },
    });
    console.log("put", put, rule.path);
  }
}
