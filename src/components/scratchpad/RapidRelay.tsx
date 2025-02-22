import {
  PlusCircleIcon,
  SquaresPlusIcon,
  UserCircleIcon,
} from "@heroicons/react/20/solid";
import { MatchData } from "robotevents";
import { Button } from "~components/Button";
import { useCallback, useMemo } from "react";
import { useShareProfile } from "~utils/hooks/share";
import { useScratchpadState } from "~utils/hooks/scratchpad";
import { RapidRelayMatchScratchpad } from "@referee-fyi/share";

export type RapidRelayScratchpadProps = {
  match: MatchData;
};

export const RapidRelayScratchpad: React.FC<RapidRelayScratchpadProps> = ({
  match,
}) => {
  const { name, key } = useShareProfile();
  const [matchCounts, setMatchCounts] = useScratchpadState<
    RapidRelayMatchScratchpad,
    "counts"
  >({
    match,
    key: "counts",
    fallback: { [key]: { goals: 0, passes: 0 } },
  });

  const counts = useMemo(() => matchCounts[key], [key, matchCounts]);
  const incrementPass = useCallback(() => {
    setMatchCounts((prev) => ({
      ...prev,
      [key]: { goals: prev[key].goals, passes: prev[key].passes + 1 },
    }));
  }, [key, setMatchCounts]);

  const incrementGoal = useCallback(() => {
    setMatchCounts((prev) => ({
      ...prev,
      [key]: { goals: prev[key].goals + 1, passes: prev[key].passes },
    }));
  }, [key, setMatchCounts]);

  return (
    <section className="mt-4">
      <ul
        className="grid gap-4"
        style={{ gridTemplateColumns: "1fr max-content max-content" }}
      >
        <li className="contents">
          <p className="flex gap-2 items-center">
            <UserCircleIcon height={20} />
            {name}
          </p>
          <p className="flex gap-2 items-center">
            <PlusCircleIcon height={20} />
            <span>{counts.passes}</span>
          </p>
          <p className="flex gap-2 items-center">
            <SquaresPlusIcon height={20} />
            <span>{counts.goals}</span>
          </p>
        </li>
      </ul>
      <nav className="flex gap-2">
        <Button
          mode="normal"
          className="flex gap-2 items-center mt-2 justify-center h-12"
          onClick={incrementPass}
        >
          <PlusCircleIcon height={20} /> Pass
        </Button>
        <Button
          mode="normal"
          className="flex gap-2 items-center mt-2 justify-center h-12"
          onClick={incrementGoal}
        >
          <SquaresPlusIcon height={20} /> Goal
        </Button>
      </nav>
    </section>
  );
};
