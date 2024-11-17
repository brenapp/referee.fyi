import { CodeBracketSquareIcon, StarIcon } from "@heroicons/react/20/solid";
import { MatchData } from "robotevents";
import { Checkbox, Radio } from "~components/Input";
import { RapidRelayMatchScratchpad } from "@referee-fyi/share";
import {
  useMatchScratchpad,
  useScratchpadState,
} from "~utils/hooks/scratchpad";
import { EditHistory } from "~components/EditHistory";

export type RapidRelayScratchpadProps = {
  match: MatchData;
};

export const RapidRelayScratchpad: React.FC<RapidRelayScratchpadProps> = ({
  match,
}) => {
  const { data } = useMatchScratchpad<RapidRelayMatchScratchpad>(match);

  // Bindings
  const [counts, setAuto] = useScratchpadState<
    RapidRelayMatchScratchpad,
    "counts"
  >({
    match,
    key: "counts",
    fallback: {},
  });

  return (
    <section>
      <section
        className="bg-zinc-800 p-4 mt-4 rounded-md"
        aria-label="Auto Winner"
      >
        <div className="flex items-center gap-2">
          <CodeBracketSquareIcon height={20} />
          <p>Auto Winner</p>
        </div>
        <fieldset
          className="mt-2 flex gap-2"
          role="radiogroup"
          aria-label="Auto Winner"
        >
          <Radio
            name="autoWinner"
            label="Red"
            bind={{ value: counts, onChange: setAuto, variant: "red" }}
            className="data-[selected=true]:bg-red-800"
          />
          <Radio
            name="autoWinner"
            label="Blue"
            bind={{ value: counts, onChange: setAuto, variant: "blue" }}
            className="data-[selected=true]:bg-blue-800"
          />
          <Radio
            name="autoWinner"
            label="Tie"
            bind={{ value: counts, onChange: setAuto, variant: "tie" }}
            className="data-[selected=true]:bg-purple-800"
          />
          <Radio
            name="autoWinner"
            label="None"
            bind={{ value: counts, onChange: setAuto, variant: "none" }}
            className="data-[selected=true]:bg-zinc-900"
          />
        </fieldset>
        <EditHistory
          value={data}
          valueKey="auto"
          className="mt-4"
          render={(value) => {
            switch (value) {
              case "red":
                return "Red Win";
              case "blue":
                return "Blue Win";
              case "tie":
                return "Tie";
              case "none":
                return "None";
            }
          }}
        />
      </section>
      <section
        className="bg-zinc-800 p-4 mt-4 rounded-md"
        aria-label="Auto Winner"
      >
        <div className="flex items-center gap-2">
          <StarIcon height={20} />
          <p>AWP</p>
        </div>
        <fieldset className="mt-2 flex gap-2" aria-label="Autonomous Win Point">
          <Checkbox
            label="Red"
            bind={{
              value: awp.red,
              onChange: (value) => setAWP((awp) => ({ ...awp, red: value })),
            }}
            className="accent-red-400 mt-0"
            aria-label="Red AWP"
            labelProps={{
              className: "has-[:checked]:bg-red-800 mt-0 flex-1 px-4",
            }}
          />
          <Checkbox
            label="Blue"
            bind={{
              value: awp.blue,
              onChange: (value) => setAWP((awp) => ({ ...awp, blue: value })),
            }}
            aria-label="Blue AWP"
            className="accent-blue-400 mt-0"
            labelProps={{
              className: "has-[:checked]:bg-blue-800 mt-0 flex-1 px-4",
            }}
          />
        </fieldset>
        <EditHistory
          value={data}
          valueKey="awp"
          className="mt-4"
          render={(value) =>
            `${value.red ? "Red AWP" : ""} ${value.blue ? "Blue AWP" : ""}${
              !value.blue && !value.red ? "No AWP" : ""
            }`
          }
        />
      </section>
    </section>
  );
};
