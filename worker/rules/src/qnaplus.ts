import { paths } from "@referee-fyi/rules/qnaplus";
import createClient from "openapi-fetch";

export const client = createClient<paths>({
  baseUrl: "https://api.qnapl.us",
});
