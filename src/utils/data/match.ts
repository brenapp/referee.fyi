import { type Match, Round } from "robotevents/out/endpoints/matches";

export function shortMatchName(match: Match) {
    switch (match.round) {

        case Round.Practice: {
            return `P${match.matchnum}`;
        }

        case Round.Qualification: {
            return `Q${match.matchnum}`;
        };

        case Round.RoundOf16: {
            return `R16${match.instance}-${match.matchnum}`;
        };

        case Round.Quarterfinals: {
            return `QF${match.instance}-${match.matchnum}`;
        }

        case Round.Semifinals: {
            return `SF${match.instance}-${match.matchnum}`;
        }

        case Round.Finals: {
            return `F${match.matchnum}`;
        };

    }
}