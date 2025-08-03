import { scheduled } from "./scheduled.js";
import { app } from "./router.js";

import "./api/search.js";
import "./api/updateQuestions.js";

export default {
  ...app,
  scheduled,
} satisfies ExportedHandler<Env>;
