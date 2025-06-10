import { Hono } from "hono";
import { scheduled } from "./scheduled";

const app = new Hono<{ Bindings: Env }>();

export default {
  ...app,
  scheduled,
} satisfies ExportedHandler<Env>;
