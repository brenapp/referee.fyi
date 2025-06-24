import type { paths } from "../generated/qnaplus.js";
export type * from "../generated/qnaplus.js";

export type Question = Exclude<
  paths["/internal/update"]["get"]["responses"]["200"]["content"]["application/json"]["questions"],
  undefined
>[number];
