import { GameSchema } from "@referee-fyi/rules";
import puppeteer from "@cloudflare/puppeteer";
import { ProgramAbbr, Year } from "robotevents";
import { normalizeRule } from "../utils";

export type GameRuleToIndex = {
  path: `${ProgramAbbr}_${Year}/rule_${string}`;
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
      for (const program of group.programs) {
        rules.push({
          path: `${program}_${result.data.season}/rule_${normalizeRule(
            rule.rule
          )}.html`,
          rule: rule.rule,
          url: rule.link,
        });
      }
    }
  }

  return { success: true, rules } as const;
}

export async function indexGameRules(env: Env, url: string) {
  const rules = await getGameRulesToIndex(url);

  if (!rules.success) {
    return;
  }

  // @ts-expect-error fetch nonsense from Cloudflare Workers Runtime
  const browser = await puppeteer.launch(env.BROWSER);

  const cache: Record<string, string> = {};

  for (const rule of rules.rules) {
    let html = "";

    if (cache[rule.url]) {
      html = cache[rule.url];
    } else {
      const page = await browser.newPage();
      await page.goto(rule.url, { waitUntil: "networkidle0" });
      html = await page.content();
      await page.close();

      if (!html) {
        continue;
      }
    }
    cache[rule.url] = html;

    await env.rules.put(rule.path, html, {
      httpMetadata: {
        contentType: "text/html",
        cacheControl: "max-age=31536000, immutable",
      },
    });
  }
}
