export function normalizeRule(rule: string): string {
  return rule.replace(/<|>/g, "").trim();
}
