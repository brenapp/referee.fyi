import { MatchData } from "robotevents";
import { useEvent, useSeason } from "~utils/hooks/robotevents";
import { DefaultV5RCScratchpad } from "./DefaultV5RC";
import { ProgramAbbr } from "robotevents";

export type MatchScratchpadProps = {
  match: MatchData;
};

export const MatchScratchpad: React.FC<MatchScratchpadProps> = ({ match }) => {
  const { data: event } = useEvent(match.event.code);
  const { data: season } = useSeason(event?.season.id);

  if (!event || !season) {
    return null;
  }

  switch (event.program.code as ProgramAbbr) {
    case "VAIRC":
    case "VURC":
    case "V5RC": {
      return <DefaultV5RCScratchpad key={match.id} match={match} />;
    }
    default: {
      return null;
    }
  }
};
