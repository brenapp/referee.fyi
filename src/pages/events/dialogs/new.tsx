import {
  useEventMatches,
  useEventTeams,
  useEventMatch,
  useEventTeam,
  useEventMatchesForTeam,
} from "~hooks/robotevents";
import { Rule, useRulesForProgram } from "~utils/hooks/rules";
import { RulesMultiSelect, Select, TextArea } from "~components/Input";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "~components/Button";
import { MatchContext } from "~components/Context";
import { useCurrentDivision, useCurrentEvent, useSKU } from "~hooks/state";
import {
  IncidentOutcome,
  RichIncident,
  packIncident,
} from "~utils/data/incident";
import { useNewIncident } from "~hooks/incident";
import { Dialog, DialogBody, DialogHeader } from "~components/Dialog";
import { useAddRecentRules, useRecentRules } from "~utils/hooks/history";
import { twMerge } from "tailwind-merge";
import { toast } from "~components/Toast";
import { Spinner } from "~components/Spinner";
import { MatchData } from "robotevents/out/endpoints/matches";
import { queryClient } from "~utils/data/query";

export type EventNewIncidentDialogProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
  initialTeamNumber?: string | null;
  initialMatchId?: number | null;
  preventSave?: boolean;
};

export const EventNewIncidentDialog: React.FC<EventNewIncidentDialogProps> = ({
  open,
  setOpen,
  initialMatchId,
  initialTeamNumber,
  preventSave,
}) => {
  const { mutate } = useNewIncident();

  const sku = useSKU();
  const { data: event, isLoading: isLoadingEvent } = useCurrentEvent();
  const division = useCurrentDivision();

  const rules = useRulesForProgram(event?.program.code);
  const { data: recentRules } = useRecentRules(event?.program.code ?? "VRC", 4);
  const { mutateAsync: addRecentRules } = useAddRecentRules(
    event?.program.code ?? "VRC"
  );

  // Find all teams and matches at the event
  const { data: teams, isLoading: isLoadingTeams } = useEventTeams(event);
  const { data: matches, isLoading: isLoadingMatches } = useEventMatches(
    event,
    division
  );

  // Load team and match data
  const initialMatch = useEventMatch(event, division, initialMatchId);

  // Initialise current team and match
  const [team, setTeam] = useState(initialTeamNumber);
  const [match, setMatch] = useState(initialMatch?.id);

  const teamData = useEventTeam(event, team);
  const eventMatchData = useEventMatch(event, division, match);

  // Edge-case: if we are not in a specific division (i.e. in the team page), load all matches for
  // the team at the event.
  const { data: allTeamMatches, isLoading: isLoadingAllTeamMatches } =
    useEventMatchesForTeam(event, teamData, undefined, {
      enabled: !division,
    });

  const allTeamsMatchesMatchData = allTeamMatches?.find((m) => m.id === match);
  const matchData = eventMatchData ?? allTeamsMatchesMatchData;

  const teamMatches = useMemo(() => {
    if (!team) {
      return [];
    }

    if (!division && allTeamMatches) {
      return allTeamMatches;
    }

    return (
      matches?.filter((match) => {
        const teams = match.alliances
          .map((a) => a.teams.map((t) => t.team.name))
          .flat();
        return teams.includes(team);
      }) ?? []
    );
  }, [matches, team, allTeamMatches, division]);

  const teamMatchesByDiv = useMemo(() => {
    const divisions: Record<string, MatchData[]> = {};

    for (const match of teamMatches) {
      if (divisions[match.division.name]) {
        divisions[match.division.name].push(match);
      } else {
        divisions[match.division.name] = [match];
      }
    }

    return Object.entries(divisions);
  }, [teamMatches]);

  const isLoadingMetaData =
    isLoadingEvent ||
    isLoadingTeams ||
    isLoadingMatches ||
    isLoadingAllTeamMatches;

  const [incident, setIncident] = useState<RichIncident>({
    time: new Date(),
    division: division ?? 1,
    event: sku ?? "",
    team: teamData,
    match: matchData,
    rules: [],
    notes: "",
    outcome: "Minor",
  });

  useEffect(() => {
    setTeam(initialTeamNumber);
  }, [initialTeamNumber]);

  useEffect(() => {
    setMatch(initialMatchId ?? undefined);
  }, [initialMatchId]);

  useEffect(() => {
    setIncidentField("team", teamData);
    setIncidentField("match", matchData);
  }, [teamData, matchData]);

  const canSave = useMemo(() => {
    if (preventSave) {
      return false;
    }

    if (isLoadingMetaData) {
      return false;
    }
    return !!team || !!event;
  }, [preventSave, isLoadingMetaData, team, event]);

  const setIncidentField = <T extends keyof RichIncident>(
    key: T,
    value: RichIncident[T]
  ) => {
    setIncident((i) => ({
      ...i,
      [key]: value,
    }));
  };

  const onChangeIncidentTeam = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newTeam = teams?.find((t) => t.number === e.target.value);
      if (e.target.value === "-1") {
        setMatch(undefined);
        setTeam(undefined);
      }

      setIncidentField("team", newTeam);
      setTeam(newTeam?.number);
    },
    [teams]
  );

  const onChangeIncidentMatch = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      let matchPool = matches;

      if (!division) {
        matchPool = allTeamMatches;
      }

      const newMatch = matchPool?.find(
        (m) => m.id.toString() === e.target.value
      );

      if (e.target.value === "-1") {
        setMatch(undefined);
        setTeam(undefined);
      }

      if (!newMatch) return;

      setIncidentField("match", newMatch);
      setMatch(newMatch.id);
    },
    [matches, allTeamMatches, division]
  );

  const onChangeIncidentOutcome = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setIncidentField("outcome", e.target.value as IncidentOutcome);
    },
    []
  );

  const onAddRule = useCallback(
    (rule: Rule) => {
      if (incident.rules.some((r) => r.rule === rule.rule)) return;
      setIncidentField("rules", [...incident.rules, rule]);
    },
    [incident.rules]
  );

  const onRemoveRule = useCallback(
    (rule: Rule) => {
      setIncidentField(
        "rules",
        incident.rules.filter((r) => r.rule !== rule.rule)
      );
    },
    [incident.rules]
  );

  const onToggleRule = useCallback(
    (rule: Rule) => {
      if (incident.rules.some((r) => r.rule === rule.rule)) {
        onRemoveRule(rule);
      } else {
        onAddRule(rule);
      }
    },
    [incident.rules, onAddRule, onRemoveRule]
  );

  const onChangeIncidentRules = useCallback((rules: Rule[]) => {
    setIncidentField("rules", rules);
  }, []);

  const onChangeIncidentNotes = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setIncidentField("notes", e.target.value);
    },
    []
  );

  const onSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement> | React.MouseEvent) => {
      e.preventDefault();
      const packed = packIncident(incident);
      setOpen(false);
      mutate(packed, {
        onSuccess: () => {
          setTeam(initialTeamNumber);
          setMatch(initialMatch?.id);

          setIncidentField("team", undefined);
          setIncidentField("notes", "");
          setIncidentField("rules", []);
          setIncidentField("outcome", "Minor");
          addRecentRules(incident.rules);

          toast({ type: "info", message: "Created Entry" });
          queryClient.invalidateQueries({ queryKey: ["incidents"] });
        },
        onError: (error) => {
          toast({ type: "error", message: `${error}` });
        },
      });
    },
    [incident, mutate, setOpen, addRecentRules, initialMatch?.id]
  );

  return (
    <Dialog open={open} mode="modal" onClose={() => setOpen(false)}>
      <DialogHeader title="New Report" onClose={() => setOpen(false)} />
      <DialogBody>
        <Spinner show={isLoadingMetaData} />
        <label>
          <p className="mt-4">Match</p>
          <Select
            value={incident.match?.id ?? -1}
            onChange={onChangeIncidentMatch}
            className="max-w-full w-full"
          >
            <option value={-1}>Pick A Match</option>
            {team &&
              teamMatchesByDiv?.map(([name, matches]) => (
                <optgroup label={name} key={name}>
                  {matches.map((match) => (
                    <option value={match.id} key={match.id}>
                      {match.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            {!team &&
              matches?.map((match) => (
                <option value={match.id} key={match.id}>
                  {match.name}
                </option>
              ))}
          </Select>
        </label>
        {incident.match && (
          <MatchContext
            match={incident.match}
            className="mt-4 justify-between"
            allianceClassName="w-full"
          />
        )}
        <label>
          <p className="mt-4">Team</p>
          <Select
            value={incident.team?.number ?? -1}
            onChange={onChangeIncidentTeam}
            className="max-w-full w-full"
          >
            <option value={-1}>Pick A Team</option>
            {matchData?.alliances.map((alliance) => (
              <optgroup
                key={alliance.color.toUpperCase()}
                label={alliance.color.toUpperCase()}
              >
                {alliance.teams.map(({ team }) => (
                  <option value={team.name} key={team.id}>
                    {team.name}
                  </option>
                ))}
              </optgroup>
            ))}
            {!match &&
              teams?.map((team) => (
                <option value={team.number} key={team.id}>
                  {team.number}
                </option>
              ))}
          </Select>
        </label>
        <label>
          <p className="mt-4">Outcome</p>
          <Select
            value={incident.outcome}
            onChange={onChangeIncidentOutcome}
            className="max-w-full w-full"
          >
            <option value="General">General</option>
            <option value="Minor">Minor</option>
            <option value="Major">Major</option>
            <option value="Disabled">Disabled</option>
          </Select>
        </label>
        <label>
          <p className="mt-4">Associated Rules</p>
          <div className="flex mt-2 gap-2 flex-wrap md:flex-nowrap">
            {recentRules?.map((rule) => (
              <Button
                mode="none"
                className={twMerge(
                  "text-emerald-400 font-mono min-w-min flex-shrink",
                  incident.rules.some((r) => r.rule === rule.rule)
                    ? "bg-emerald-600 text-zinc-50"
                    : ""
                )}
                onClick={() => onToggleRule(rule)}
                key={rule.rule}
              >
                {rule.rule}
              </Button>
            ))}
          </div>
          <RulesMultiSelect
            game={rules!}
            value={incident.rules}
            onChange={onChangeIncidentRules}
          />
        </label>
        <label>
          <p className="mt-4">Notes</p>
          <TextArea
            className="w-full mt-2 h-32"
            value={incident.notes}
            onChange={onChangeIncidentNotes}
          />
        </label>
      </DialogBody>
      <Button
        className="w-full text-center my-4 bg-emerald-400 text-black"
        disabled={!canSave}
        onClick={onSubmit}
      >
        Submit
      </Button>
    </Dialog>
  );
};
