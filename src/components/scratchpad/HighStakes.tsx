import {
  CodeBracketSquareIcon,
  StarIcon,
  ClockIcon,
} from "@heroicons/react/20/solid";
import { Dispatch, SetStateAction, useCallback, useMemo } from "react";
import { MatchData, rounds } from "robotevents";
import { Checkbox, Radio } from "~components/Input";
import {
  EditScratchpad,
  HighStakesMatchScratchpad,
  IncidentMatchHeadToHead,
  MatchScratchpad,
} from "@referee-fyi/share";
import {
  useDefaultScratchpad,
  useMatchScratchpad,
  useMatchScratchpads,
  useUpdateMatchScratchpad,
} from "~utils/hooks/scratchpad";
import { EditHistory } from "~components/EditHistory";
import { useEventMatches } from "~utils/hooks/robotevents";
import { useCurrentDivision, useCurrentEvent } from "~utils/hooks/state";
import { isMatchElimination } from "~utils/data/robotevents";

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
        <fieldset
          className="mt-2 flex gap-2"
          role="radiogroup"
          aria-label="Auto Winner"
        >
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
      {isMatchElimination(match) && (
        <AllianceTimeoutUsedScratchpad match={match} />
      )}
    </section>
  );
};

export const AllianceTimeoutUsedScratchpad: React.FC<
  HighStakesScratchpadProps
> = ({ match }) => {
  const { data } = useMatchScratchpad<HighStakesMatchScratchpad>(match);
  const { data: event } = useCurrentEvent();
  const division = useCurrentDivision();
  1;
  const { data: eliminationMatches } = useEventMatches(event, division, {
    "round[]": [
      rounds.RoundOf16,
      rounds.Quarterfinals,
      rounds.Semifinals,
      rounds.Finals,
    ],
  });

  const [currentMatchTimeouts, setCurrentMatchTimeouts] = useScratchpadState<
    HighStakesMatchScratchpad,
    "timeout_used"
  >({
    match,
    key: "timeout_used",
    fallback: { blue: false, red: false },
  });

  const { data: matchScratchpads } =
    useMatchScratchpads<HighStakesMatchScratchpad>(eliminationMatches);

  const allianceTimeouts = useMemo(() => {
    const timeouts: Record<string, IncidentMatchHeadToHead[]> = {};

    for (const scratchpad of matchScratchpads ?? []) {
      if (!scratchpad) {
        continue;
      }

      const match = eliminationMatches?.find(
        (match) => match.name === scratchpad.match.name
      );

      if (scratchpad.timeout_used.red) {
        const teams = match
          ?.alliance("red")
          .teams.map((t) => t.team!.name)
          ?.join("-");

        if (teams && timeouts[teams]) {
          timeouts[teams].push(scratchpad.match);
        } else if (teams) {
          timeouts[teams] = [scratchpad.match];
        }
      }

      if (scratchpad.timeout_used.blue) {
        const teams = match
          ?.alliance("blue")
          .teams.map((t) => t.team!.name)
          ?.join("-");

        if (teams && timeouts[teams]) {
          timeouts[teams].push(scratchpad.match);
        } else if (teams) {
          timeouts[teams] = [scratchpad.match];
        }
      }
    }

    return timeouts;
  }, [matchScratchpads, eliminationMatches]);

  const redTeams = useMemo(
    () =>
      match.alliances
        .find((a) => a.color === "red")
        ?.teams.map((t) => t.team!.name)
        ?.join("-"),
    [match]
  );
  const redTimeouts = useMemo(
    () => allianceTimeouts[redTeams ?? ""],
    [allianceTimeouts, redTeams]
  );

  const blueTeams = useMemo(
    () =>
      match.alliances
        .find((a) => a.color === "blue")
        ?.teams.map((t) => t.team!.name)
        ?.join("-"),
    [match]
  );
  const blueTimeouts = useMemo(
    () => allianceTimeouts[blueTeams ?? ""],
    [allianceTimeouts, blueTeams]
  );

  console.log(allianceTimeouts);

  return (
    <section
      className="bg-zinc-800 p-4 mt-4 rounded-md"
      aria-label="Timeouts Used"
    >
      <div className="flex items-center gap-2">
        <ClockIcon height={20} />
        <p>Timeouts Used</p>
      </div>
      <fieldset className="mt-2 flex gap-2" aria-label="Autonomous Win Point">
        <Checkbox
          label={
            "Red " + (redTimeouts?.length > 0 ? `(${redTimeouts[0].name})` : "")
          }
          bind={{
            value: currentMatchTimeouts.red,
            onChange: (value) =>
              setCurrentMatchTimeouts((timeouts) => ({
                ...timeouts,
                red: value,
              })),
          }}
          disabled={redTimeouts?.length > 0 && !currentMatchTimeouts.red}
          className="accent-red-400 mt-0"
          aria-label="Red AWP"
          labelProps={{
            className: "has-[:checked]:bg-red-800 mt-0 flex-1 px-4",
          }}
        />
        <Checkbox
          label={
            "Blue " +
            (blueTimeouts?.length > 0 ? `(${blueTimeouts[0].name})` : "")
          }
          disabled={blueTimeouts?.length > 0 && !currentMatchTimeouts.blue}
          bind={{
            value: currentMatchTimeouts.blue,
            onChange: (value) =>
              setCurrentMatchTimeouts((timeouts) => ({
                ...timeouts,
                blue: value,
              })),
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
        valueKey="timeout_used"
        className="mt-4"
        render={(value) =>
          `${value.red ? "Red Used Timeout" : ""} ${
            value.blue ? "Blue Used Timeout" : ""
          }${!value.blue && !value.red ? "No Timeouts Used" : ""}`
        }
      />
    </section>
  );
};
