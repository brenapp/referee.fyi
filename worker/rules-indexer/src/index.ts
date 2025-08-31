import { scheduled } from "./scheduled.js";
import { app } from "./router.js";

export default {
  ...app,
  scheduled,
} satisfies ExportedHandler<Env>;
