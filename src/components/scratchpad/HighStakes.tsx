import { useEffect, useState } from "react";
import { MatchData } from "robotevents/out/endpoints/matches";
import { Checkbox, Radio } from "~components/Input";
import { HighStakesMatchScratchpad } from "~share/MatchScratchpad";
import { setMatchScratchpad } from "~utils/data/scratchpad";
import {
  useDefaultScratchpad,
  useMatchScratchpad,
  useUpdateMatchScratchpad,
} from "~utils/hooks/scratchpad";

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
      setMatchScratchpad(match, fallback);
    }
  }, [data, fallback, match]);

  useEffect(() => {
    updateScratchpad({
      auto: autoWinner,
      awp: { red: redAWP, blue: blueAWP },
      notes: "",
    });
  }, [redAWP, blueAWP, autoWinner, updateScratchpad]);

  return (
    <section>
      <section className="flex items-center bg-zinc-800 p-2 gap-4 mt-4 rounded-md">
        <p className="w-1/2">Auto Winner</p>
        <Radio
          name="autoWinner"
          label="Red"
          bind={{ value: autoWinner, onChange: setAutoWinner, variant: "red" }}
          className="accent-red-400"
          labelProps={{ className: "has-[:checked]:bg-red-800 mt-0 flex-1" }}
        />
        <Radio
          name="autoWinner"
          label="Blue"
          bind={{ value: autoWinner, onChange: setAutoWinner, variant: "blue" }}
          className="accent-blue-400"
          labelProps={{ className: "has-[:checked]:bg-blue-800 mt-0 flex-1" }}
        />
        <Radio
          name="autoWinner"
          label="Tie"
          className="accent-purple-400"
          bind={{ value: autoWinner, onChange: setAutoWinner, variant: "tie" }}
          labelProps={{ className: "has-[:checked]:bg-purple-800 mt-0 flex-1" }}
        />
        <Radio
          name="autoWinner"
          label="None"
          bind={{ value: autoWinner, onChange: setAutoWinner, variant: "none" }}
          labelProps={{ className: "mt-0 flex-1" }}
        />
      </section>
      <section className="flex items-center bg-zinc-800 p-2 gap-4 mt-4 rounded-md">
        <p className="w-1/2">AWP</p>
        <Checkbox
          label="Red"
          bind={{ value: redAWP, onChange: setRedAWP }}
          className="accent-red-400 mt-0"
          labelProps={{ className: "has-[:checked]:bg-red-800 mt-0 flex-1" }}
        />
        <Checkbox
          label="Blue"
          bind={{ value: blueAWP, onChange: setBlueAWP }}
          className="accent-blue-400 mt-0"
          labelProps={{ className: "has-[:checked]:bg-blue-800 mt-0 flex-1" }}
        />
      </section>
    </section>
  );
};
