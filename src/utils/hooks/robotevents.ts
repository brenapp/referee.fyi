import * as robotevents from "robotevents";
import { UseQueryResult, useQuery } from "react-query";
import { Round, type Match } from "robotevents/out/endpoints/matches";

const ROBOTEVENTS_TOKEN =
    "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIzIiwianRpIjoiYjM5Y2I1NGNhMTk0OTM0ODNmNTc0MDQ2MTRhZDY0MDZjYTY1ZmQzMjAzNDlhMmM5YmUwOThlNmJjNzhhZWJmZmZjYzU0ZWY2MTQ2ZmQyYjEiLCJpYXQiOjE2ODc2NDIzODcuNTUwMjg4LCJuYmYiOjE2ODc2NDIzODcuNTUwMjkxMSwiZXhwIjoyNjM0NDE3MTg3LjUzNzIzNjIsInN1YiI6Ijk3MDY5Iiwic2NvcGVzIjpbXX0.k0DEt3QRKkgZnyV8X9mDf6VYyc8aOsIEfQbVN4Gi6Csr7O5ILLGFENXZouvplqbcMDdQ8gBMMLg5hIR38RmrTsKcWHMndq1T8wYkGZQfRhc_uZYLQhGQCaanf_F_-gnKocFwT1AKQJmAPkAbV-Itb2UzHeGpNuW8vV_TaNL3coaYvmM6rubwBuNYgyZhTHW_Mgvzh5-XBqqGpmQLm9TGl4gkeqnS-6a5PfoqRTc8v3CQWSCURFry5BA2oXz0lcWmq92FY5crr2KKv1O3chPr--oMba97elY0y9Dw0q2ipKcTm4pE7bbFP8t7-a_RKU4OyXuHRIQXjw3gEDCYXY5Hp22KMY0idnRIPhat6fybxcRfeyzUzdnubRBkDMNklwlgNCyeu2ROqEOYegtu5727Wwvy2I-xW-ZVoXg0rggVu7jVq6zmBqDFIcu50IS9R4P6a244pg2STlBaAGpzT2VfUqCBZrbtBOvdmdNzxSKIkl1AXeOIZOixo1186PX54p92ehXfCbcTgWrQSLuAAg_tBa6T7UFKFOGecVFo3v0vkmE__Q5-701f1qqcdDRNlOG-bzzFh9QLEdJWlpEajwYQ1ZjTAlbnBpKy3IrU0Aa-Jr0aqxtzgr5ZlghNtOcdYYRw5_BN0BOMmAnkvtm0_xzIJSsFbWJQJ8QpPk_n4zKZf-Y";

robotevents.authentication.setBearer(ROBOTEVENTS_TOKEN);

export function useEvent(sku: string) {
    return useQuery(["event", sku], async () => {
        if (!sku) {
            return null;
        }

        return await robotevents.events.get(sku);
    });
}


export function useEventTeams(
    event: robotevents.events.Event | null | undefined
): UseQueryResult<robotevents.teams.Team[]> {
    return useQuery(["teams", event?.sku], async () => {
        if (!event) {
            return [];
        }

        const teams = await event.teams({ registered: true });
        return teams.array();
    });
}

export function logicalMatchComparison(a: Match, b: Match) {

    const roundOrder = [Round.Practice, Round.Qualification, Round.RoundOf16, Round.Quarterfinals, Round.Semifinals, Round.Finals]

    if (a.round !== b.round) {
        return roundOrder.indexOf(a.round) - roundOrder.indexOf(b.round);
    }

    if (a.instance !== b.instance) {
        return a.instance - b.instance;
    }

    return a.matchnum - b.matchnum;
};

export function useEventMatches(
    event: robotevents.events.Event | null | undefined,
    division: number | null | undefined
): UseQueryResult<Match[]> {
    return useQuery(["matches", event?.sku, division], async () => {
        if (!event || !division) {
            return [];
        }
        const matches = await event.matches(division);

        return matches.array().sort((a, b) => logicalMatchComparison(a, b));
    });
}


export function useEventsToday(): UseQueryResult<robotevents.events.Event[]> {

    const currentSeasons = (["VRC", "VEXU", "VIQRC"] as const).map(program => robotevents.seasons.current(program)) as number[];

    return useQuery("events_today", async () => {

        const today = new Date();

        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 4);
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 4);

        const events = await robotevents.events.search({
            start: yesterday.toISOString(),
            end: tomorrow.toISOString(),
            season: currentSeasons,
        });

        return events.sort((a, b) => a.name.localeCompare(b.name));
    });
}