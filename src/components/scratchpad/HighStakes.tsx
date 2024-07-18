import { CodeBracketSquareIcon, StarIcon } from "@heroicons/react/20/solid";
import { useEffect, useState } from "react";
import { MatchData } from "robotevents/out/endpoints/matches";
import { Checkbox, Radio } from "~components/Input";
import { HighStakesMatchScratchpad } from "~share/MatchScratchpad";
import { userString } from "~utils/data/incident";
import { getScratchpadID, setMatchScratchpad } from "~utils/data/scratchpad";
import {
  useDefaultScratchpad,
  useMatchScratchpad,
  usePropertyLastChangeLogForScratchpad,
  useUpdateMatchScratchpad,
} from "~utils/hooks/scratchpad";
import { timeAgo } from "~utils/time";

export type HighStakesScratchpadProps = {
  match: MatchData;
};

export const HighStakesScratchpad: React.FC<HighStakesScratchpadProps> = ({
  match,
}) => {
  const { data: fallback } =
    useDefaultScratchpad<HighStakesMatchScratchpad>(match);
  const { data } = useMatchScratchpad<HighStakesMatchScratchpad>(match);
  const { mutateAsync: updateScratchpad } =
    useUpdateMatchScratchpad<HighStakesMatchScratchpad>(match);

  const changeLog = usePropertyLastChangeLogForScratchpad(data);

  const [autoWinner, setAutoWinner] = useState(
    data ? data.auto : fallback?.auto ?? "none"
  );

  const [redAWP, setRedAWP] = useState(
    data ? data.awp.red : fallback?.awp.red ?? false
  );
  const [blueAWP, setBlueAWP] = useState(
    data ? data.awp.blue : fallback?.awp.blue ?? false
  );

  // Initialize scratchpad
  useEffect(() => {
    if (!data && fallback) {
      const id = getScratchpadID(match);
      setMatchScratchpad(id, fallback);
    }
  }, [data, fallback, match]);

  // Send out notifications when we change
  useEffect(() => {
    updateScratchpad({
      auto: autoWinner,
      awp: { red: redAWP, blue: blueAWP },
      notes: "",
    });
  }, [redAWP, blueAWP, autoWinner, updateScratchpad]);

  // Update local variables when we get an update
  useEffect(() => {
    if (!data) {
      return;
    }

    setAutoWinner(data.auto);
    setRedAWP(data.awp.red);
    setBlueAWP(data.awp.blue);
  }, [data]);

  return (
    <section>
      <section className="bg-zinc-800 p-4 mt-4 rounded-md">
        <div className="flex items-center gap-2">
          <CodeBracketSquareIcon height={20} />
          <p>Auto Winner</p>
          <span>
            {changeLog.auto ? (
              <span className="text-sm ml-2 italic text-emerald-400">
                {userString(changeLog.auto.user)},&nbsp;
                {timeAgo(changeLog.auto.date)}
              </span>
            ) : null}
          </span>
        </div>
        <fieldset className="mt-2 flex gap-2">
          <Radio
            name="autoWinner"
            label="Red"
            bind={{
              value: autoWinner,
              onChange: setAutoWinner,
              variant: "red",
            }}
            className="accent-red-400"
            labelProps={{
              className: "has-[:checked]:bg-red-800 mt-0 flex-1 px-2",
            }}
          />
          <Radio
            name="autoWinner"
            label="Blue"
            bind={{
              value: autoWinner,
              onChange: setAutoWinner,
              variant: "blue",
            }}
            className="accent-blue-400"
            labelProps={{
              className: "has-[:checked]:bg-blue-800 mt-0 flex-1 px-2",
            }}
          />
          <Radio
            name="autoWinner"
            label="Tie"
            className="accent-purple-400"
            bind={{
              value: autoWinner,
              onChange: setAutoWinner,
              variant: "tie",
            }}
            labelProps={{
              className: "has-[:checked]:bg-purple-800 mt-0 flex-1 px-2",
            }}
          />
          <Radio
            name="autoWinner"
            label="None"
            bind={{
              value: autoWinner,
              onChange: setAutoWinner,
              variant: "none",
            }}
            labelProps={{ className: "mt-0 flex-1 px-2" }}
          />
        </fieldset>
      </section>
      <section className="bg-zinc-800 p-4 mt-4 rounded-md">
        <div className="flex items-center gap-2">
          <StarIcon height={20} />
          <p>AWP</p>
          {changeLog.awp ? (
            <span className="text-sm ml-2 italic text-emerald-400">
              {userString(changeLog.awp.user)},&nbsp;
              {timeAgo(changeLog.awp.date)}
            </span>
          ) : null}
        </div>
        <div className="mt-2 flex gap-2">
          <Checkbox
            label="Red"
            bind={{ value: redAWP, onChange: setRedAWP }}
            className="accent-red-400 mt-0"
            labelProps={{
              className: "has-[:checked]:bg-red-800 mt-0 flex-1 px-4",
            }}
          />
          <Checkbox
            label="Blue"
            bind={{ value: blueAWP, onChange: setBlueAWP }}
            className="accent-blue-400 mt-0"
            labelProps={{
              className: "has-[:checked]:bg-blue-800 mt-0 flex-1 px-4",
            }}
          />
        </div>
      </section>
    </section>
  );
};
