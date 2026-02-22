import { useEvent, useEventTeams } from "./robotevents";
import { getTeamExcellenceEligibilityList } from "~utils/data/awardEligibility";

export function useTeamExcellenceEligibilityList(
    sku?: string | null,
) {
    const { data: event } = useEvent(sku);
}
