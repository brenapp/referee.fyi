import { app } from "./routes.js";
import { scheduled } from "./scheduled.js";

export default {
	...app,
	scheduled,
} satisfies ExportedHandler<Env>;
