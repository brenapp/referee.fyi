import { Hono } from "hono";
import { indexGameRules, scheduled } from "./scheduled";

const app = new Hono<{ Bindings: Env }>();

app.post("/api/rules-indexer", async (c) => {
  await indexGameRules(c.env, "https://referee.fyi/rules/V5RC/2024-2025.json");
  return c.json({ success: true });
});

export default {
  ...app,
  scheduled,
} satisfies ExportedHandler<Env>;
