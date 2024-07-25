import { CodeBracketSquareIcon, StarIcon } from "@heroicons/react/20/solid";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import { MatchData } from "robotevents/out/endpoints/matches";
import { Checkbox, Radio } from "~components/Input";
import { HighStakesMatchScratchpad, MatchScratchpad } from "@referee-fyi/share";
import {
  useDefaultScratchpad,
  useMatchScratchpad,
  useUpdateMatchScratchpad,
} from "~utils/hooks/scratchpad";
import { EditHistory } from "~components/EditHistory";

type ScratchpadState<T extends MatchScratchpad, K extends keyof T> = {
  data: T | null | undefined;
  key: K;
  fallback: T[K];
  mutateAsync: ReturnType<typeof useUpdateMatchScratchpad<T>>["mutateAsync"];
};

function useScratchpadState<T extends MatchScratchpad, K extends keyof T>({
  data,
  key,
  fallback,
  mutateAsync,
}: ScratchpadState<T, K>): [T[K], Dispatch<SetStateAction<T[K]>>] {
  const value = useMemo(() => data?.[key] ?? fallback, [data, fallback, key]);
  const dispatch = useCallback(
    (action: SetStateAction<T[K]>) => {
      if (!data) return;
      const newValue =
        typeof action === "function"
          ? (action as (prev: T[K]) => T[K])(value)
          : action;
      mutateAsync({ ...data, [key]: newValue });
    },
    [data, key, mutateAsync, value]
  );
  return [value, dispatch];
}

export type HighStakesScratchpadProps = {
  match: MatchData;
};

export const HighStakesScratchpad: React.FC<HighStakesScratchpadProps> = ({
  match,
}) => {
  const { data, isSuccess } =
    useMatchScratchpad<HighStakesMatchScratchpad>(match);
  const { data: defaultScratchpad } =
    useDefaultScratchpad<HighStakesMatchScratchpad>(match);
  const { mutateAsync } =
    useUpdateMatchScratchpad<HighStakesMatchScratchpad>(match);

  useEffect(() => {
    if (isSuccess && !data && defaultScratchpad) {
      mutateAsync(defaultScratchpad);
    }
  }, [data, defaultScratchpad, isSuccess, mutateAsync]);

  const [auto, setAuto] = useScratchpadState({
    data,
    key: "auto",
    fallback: "none",
    mutateAsync,
  });

  const [awp, setAWP] = useScratchpadState({
    data,
    key: "awp",
    fallback: { red: false, blue: false },
    mutateAsync,
  });

  return (
    <section>
      <section className="bg-zinc-800 p-4 mt-4 rounded-md">
        <div className="flex items-center gap-2">
          <CodeBracketSquareIcon height={20} />
          <p>Auto Winner</p>
          {data ? (
            <EditHistory
              value={data}
              valueKey="auto"
              className="ml-auto text-emerald-400"
            />
          ) : null}
        </div>
        <fieldset className="mt-2 flex gap-2">
          <Radio
            name="autoWinner"
            label="Red"
            bind={{
              value: auto,
              onChange: setAuto,
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
              value: auto,
              onChange: setAuto,
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
              value: auto,
              onChange: setAuto,
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
              value: auto,
              onChange: setAuto,
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
          {data ? (
            <EditHistory
              value={data}
              valueKey="awp"
              className="ml-auto text-emerald-400"
            />
          ) : null}
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
      </section>
    </section>
  );
};
