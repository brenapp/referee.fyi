import { CodeBracketSquareIcon, StarIcon } from "@heroicons/react/20/solid";
import { Dispatch, SetStateAction, useCallback, useMemo } from "react";
import { MatchData } from "robotevents";
import { Checkbox, Radio } from "~components/Input";
import {
  EditScratchpad,
  HighStakesMatchScratchpad,
  MatchScratchpad,
} from "@referee-fyi/share";
import {
  useDefaultScratchpad,
  useMatchScratchpad,
  useUpdateMatchScratchpad,
} from "~utils/hooks/scratchpad";
import { EditHistory } from "~components/EditHistory";

type ScratchpadState<T extends MatchScratchpad, K extends keyof T> = {
  match: MatchData;
  key: K;
  fallback: T[K];
};

function useScratchpadState<T extends MatchScratchpad, K extends keyof T>({
  match,
  key,
  fallback,
}: ScratchpadState<T, K>): [T[K], Dispatch<SetStateAction<T[K]>>] {
  const { data } = useMatchScratchpad<T>(match);
  const { data: defaultScratchpad } = useDefaultScratchpad<T>(match);
  const { mutate } = useUpdateMatchScratchpad<T>(match);

  const value = useMemo(() => data?.[key] ?? fallback, [data, key, fallback]);

  const dispatch: Dispatch<SetStateAction<T[K]>> = useCallback(
    (action: SetStateAction<T[K]>) => {
      if (!match || !defaultScratchpad) {
        return;
      }
      const updated =
        typeof action === "function"
          ? (action as (prev: T[K]) => T[K])(value)
          : action;

      const scratchpad: EditScratchpad<T> = {
        ...defaultScratchpad,
        ...data,
        [key]: updated,
      };

      mutate(scratchpad);
    },
    [data, defaultScratchpad, key, match, mutate, value]
  );

  return [value, dispatch];
}

export type HighStakesScratchpadProps = {
  match: MatchData;
};

export const HighStakesScratchpad: React.FC<HighStakesScratchpadProps> = ({
  match,
}) => {
  const { data } = useMatchScratchpad<HighStakesMatchScratchpad>(match);

  // Bindings
  const [auto, setAuto] = useScratchpadState<HighStakesMatchScratchpad, "auto">(
    {
      match,
      key: "auto",
      fallback: "none",
    }
  );

  const [awp, setAWP] = useScratchpadState<HighStakesMatchScratchpad, "awp">({
    match,
    key: "awp",
    fallback: { red: false, blue: false },
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
        <fieldset className="mt-2 flex gap-2">
          <Radio
            name="autoWinner"
            label="Red"
            bind={{ value: auto, onChange: setAuto, variant: "red" }}
            className="data-[selected=true]:bg-red-800"
          />
          <Radio
            name="autoWinner"
            label="Blue"
            bind={{ value: auto, onChange: setAuto, variant: "blue" }}
            className="data-[selected=true]:bg-blue-800"
          />
          <Radio
            name="autoWinner"
            label="Tie"
            bind={{ value: auto, onChange: setAuto, variant: "tie" }}
            className="data-[selected=true]:bg-purple-800"
          />
          <Radio
            name="autoWinner"
            label="None"
            bind={{ value: auto, onChange: setAuto, variant: "none" }}
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
        <div className="mt-2 flex gap-2">
          <Checkbox
            label="Red"
            bind={{
              value: awp.red,
              onChange: (value) => setAWP((awp) => ({ ...awp, red: value })),
            }}
            className="accent-red-400 mt-0"
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
            className="accent-blue-400 mt-0"
            labelProps={{
              className: "has-[:checked]:bg-blue-800 mt-0 flex-1 px-4",
            }}
          />
        </div>
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
