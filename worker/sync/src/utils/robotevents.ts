import { Client } from "robotevents";

export function getRobotEventsClient(env: Env) {
  return Client({ authorization: { token: env.ROBOTEVENTS_TOKEN } });
}
