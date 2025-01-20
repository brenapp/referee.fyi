import {
  PlusCircleIcon,
  SquaresPlusIcon,
  UserCircleIcon,
} from "@heroicons/react/20/solid";
import { MatchData } from "robotevents";
import { Button } from "~components/Button";
import { useCallback, useState } from "react";
import { useShareProfile } from "~utils/hooks/share";

export type RapidRelayScratchpadProps = {
  match: MatchData;
};

export const RapidRelayScratchpad: React.FC<RapidRelayScratchpadProps> = ({
  match,
}) => {
  const { name } = useShareProfile();

  const [passes, setPasses] = useState<number>(0);
  const [goals, setGoals] = useState<number>(0);

  const onPass = useCallback(() => setPasses((prev) => prev + 1), []);
  const onGoal = useCallback(() => setGoals((prev) => prev + 1), []);

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
            <span className="italic">{new Date().toTimeString()}</span>
          </p>
          <p className="flex gap-2 items-center">
            <PlusCircleIcon height={20} />
            <span>{passes}</span>
          </p>
          <p className="flex gap-2 items-center">
            <SquaresPlusIcon height={20} />
            <span>{goals}</span>
          </p>
        </li>
      </ul>
      <nav className="flex gap-2">
        <Button
          mode="normal"
          className="flex gap-2 items-center mt-2 justify-center h-12"
          onClick={onPass}
        >
          <PlusCircleIcon height={20} /> Pass
        </Button>
        <Button
          mode="normal"
          className="flex gap-2 items-center mt-2 justify-center h-12"
          onClick={onGoal}
        >
          <SquaresPlusIcon height={20} /> Goal
        </Button>
      </nav>
    </section>
  );
};
