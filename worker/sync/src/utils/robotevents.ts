import { Client } from "robotevents";
import { Env } from "../types";

export function getRobotEventsClient(env: Env) {
  return Client({ authorization: { token: env.ROBOTEVENTS_TOKEN } });
}
