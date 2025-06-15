import { indexGameRules } from "./jobs/indexGameRules";

export async function scheduled(
  event: ScheduledController,
  env: Env,
  ctx: ExecutionContext
) {
  console.log("Scheduled event triggered:", event.cron, env, ctx);

  const result = indexGameRules(
    env,
    "https://referee.fyi/rules/V5RC/2024-2025.json"
  );

  if (!result) {
    console.error("Failed to index game rules");
    return;
  }

  console.log("Game rules indexed successfully:", result);
}
