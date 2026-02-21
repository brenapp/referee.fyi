import { fetchUpdatedQNAs } from "./jobs/fetchUpdatedQNAs.js";
import { indexGameRules } from "./jobs/indexGameRules.js";
import { fetchLegalParts } from "./jobs/fetchLegalParts.js";

export async function scheduled(
  event: ScheduledController,
  env: Env,
  ctx: ExecutionContext
) {
  // console.log("Scheduled event triggered:", event.cron, env, ctx);

  // const rules = [
  //   "https://referee.fyi/rules/V5RC/2025-2026.json",
  //   "https://referee.fyi/rules/VIQRC/2025-2026.json",
  // ];

  // const result = await Promise.all(
  //   rules.map((url) => indexGameRules(env, url))
  // );

  await fetchUpdatedQNAs(env);
  await fetchLegalParts(env);

  console.log("QNAs indexed and legal parts synced successfully");
}
