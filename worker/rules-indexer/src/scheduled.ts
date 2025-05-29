/**
 * This function is called when the worker cron trigger is fired.
 **/
export function scheduled(
  event: ScheduledController,
  env: Env,
  ctx: ExecutionContext
) {
  console.log("Scheduled event triggered:", event.cron, env, ctx);
}
