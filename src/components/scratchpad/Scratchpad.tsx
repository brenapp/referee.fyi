import { useMemo } from "react";
import { MatchData } from "robotevents";
import { Year } from "robotevents";
import { useEvent, useSeason } from "~utils/hooks/robotevents";
import { HighStakesScratchpad } from "./HighStakes";
import { ProgramAbbr } from "robotevents";

export type MatchScratchpadProps = {
  match: MatchData;
};

export const MatchScratchpad: React.FC<MatchScratchpadProps> = ({ match }) => {
  const { data: event } = useEvent(match.event.code);
  const { data: season } = useSeason(event?.season.id);
  const year = useMemo(
    () => `${season?.years_start}-${season?.years_end}` as Year,
    [season]
  );

  if (!event || !season) {
    return null;
  }

  const combo = (event.program.code + year) as `${ProgramAbbr}${Year}`;
  switch (combo) {
    case "VAIRC2024-2025":
    case "VURC2024-2025":
    case "V5RC2023-2024":
    case "V5RC2024-2025": {
      return <HighStakesScratchpad key={match.id} match={match} />;
    }
    default: {
      return null;
    }
  }
};
