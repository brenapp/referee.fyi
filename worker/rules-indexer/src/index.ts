import { scheduled } from "./scheduled.js";
import { app } from "./routes.js";

export default {
  ...app,
  scheduled,
} satisfies ExportedHandler<Env>;
