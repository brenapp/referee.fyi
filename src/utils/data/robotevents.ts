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
