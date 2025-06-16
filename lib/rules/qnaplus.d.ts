import type { paths } from "./generated/qnaplus.d.ts";
export type * from "./generated/qnaplus.d.ts";

export type Question = Exclude<
  paths["/internal/update"]["get"]["responses"]["200"]["content"]["application/json"]["questions"],
  undefined
>[number];
