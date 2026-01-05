import { MatchData, rounds } from "robotevents";

export const ELIMINATION_ROUNDS = [
  rounds.RoundOf16,
  rounds.Quarterfinals,
  rounds.Semifinals,
  rounds.Finals,
] as number[];

export function isMatchElimination(match: MatchData): boolean {
  return ELIMINATION_ROUNDS.includes(match.round);
}

export function isValidSKU(sku: string) {
  return !!sku.match(
    /RE-(VRC|V5RC|VEXU|VURC|VIQRC|VIQC|VAIRC|ADC)-[0-9]{2}-[0-9]{4}/g
  );
}

export function isRestrictedSKU(sku: string) {
  return !!sku.match(/RE-(ADC)-[0-9]{2}-[0-9]{4}/g);
}
