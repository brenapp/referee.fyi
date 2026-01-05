import { useCallback, useEffect, useMemo, useState } from "react";
import { Spinner } from "~components/Spinner";
import { useAddEventVisited } from "~utils/hooks/history";
import { useCurrentEvent } from "~utils/hooks/state";
import { Button, IconButton, LinkButton } from "~components/Button";
import {
  AdjustmentsHorizontalIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";
import { useEventIncidents } from "~utils/hooks/incident";
import { Incident } from "~components/Incident";
import { Rule, useRulesForEvent } from "~utils/hooks/rules";
import { Dialog, DialogBody } from "~components/Dialog";
import { XMarkIcon } from "@heroicons/react/20/solid";
import { Checkbox, RulesMultiSelect, Select } from "~components/Input";
import { twMerge } from "tailwind-merge";
import { useMutation } from "@tanstack/react-query";
import { ReadyState, useShareConnection } from "~models/ShareConnection";
import { IncidentFlag, IncidentOutcome, OUTCOMES } from "@referee-fyi/share";
import { VirtualizedList } from "~components/VirtualizedList";
import { createFileRoute } from "@tanstack/react-router";

export type Filters = {
  outcomes: Record<IncidentOutcome, boolean>;
  rules: Rule[];
  division?: number;
  contact: Set<string>;
  flag: Record<IncidentFlag, boolean>;
};

const DEFAULT_FILTERS: Filters = {
  outcomes: {
    Disabled: true,
    General: true,
    Major: true,
    Minor: true,
    Inspection: true,
  },
  rules: [],
  contact: new Set(),
  flag: {
    judge: false,
  },
};

type FilterDialogProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
  apply: (filters: Filters) => void;
};

const FilterDialog: React.FC<FilterDialogProps> = ({
  open,
  setOpen,
  apply,
}) => {
  const { data: event } = useCurrentEvent();
  const divisions = useMemo(() => event?.divisions ?? [], [event]);
  const { data: game } = useRulesForEvent(event);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const setFiltersField = useCallback(
    <T extends keyof Filters>(key: T, value: Filters[T]) => {
      setFilters((filters) => ({ ...filters, [key]: value }));
    },
    []
  );

  const { invitations } = useShareConnection(["invitations"]);

  const onClickApply = useCallback(() => {
    setOpen(false);
    apply(filters);
  }, [apply, setOpen, filters]);

  if (!game) {
    return null;
  }

  return (
    <Dialog
      mode="modal"
      open={open}
      onClose={() => setOpen(false)}
      className="p-4"
      aria-label="Filter Incidents"
    >
      <DialogBody>
        <nav className="w-full flex pt-1 gap-2">
          <IconButton
            className="bg-transparent"
            onClick={() => setOpen(false)}
            icon={<XMarkIcon height={24} />}
          />
        </nav>
        <label>
          <p className="mt-4">Include Rules</p>
          <RulesMultiSelect
            game={game}
            value={filters.rules}
            onChange={(rules) => setFiltersField("rules", rules)}
          />
        </label>
        <p>Outcomes</p>
        {OUTCOMES.map((outcome) => (
          <Checkbox
            key={outcome}
            label={outcome}
            checked={filters.outcomes[outcome]}
            onChange={(e) =>
              setFiltersField("outcomes", {
                ...filters.outcomes,
                [outcome]: e.currentTarget.checked,
              })
            }
          />
        ))}
        {divisions.length > 0 ? (
          <label>
            <p className="mt-4">Division</p>
            <Select
              value={filters.division}
              onChange={(e) =>
                setFiltersField(
                  "division",
                  isNaN(Number.parseInt(e.currentTarget.value))
                    ? undefined
                    : Number.parseInt(e.currentTarget.value)
                )
              }
              className="w-full"
            >
              <option value={undefined}>Pick Division</option>
              {divisions
                .sort((a, b) => a.order! - b.order!)
                .map((div) => (
                  <option value={div.id} key={div.id}>
                    {div.name}
                  </option>
                ))}
            </Select>
          </label>
        ) : null}
        <label>
          <p className="mt-4">Flags</p>
          <Checkbox
            label={"Judging"}
            checked={filters.flag?.judge ?? false}
            onChange={(e) =>
              setFiltersField("flag", {
                ...filters.flag,
                judge: e.currentTarget.checked,
              })
            }
          />
        </label>
        {invitations.length > 0 ? (
          <label>
            <p className="mt-4">User Created/Modified</p>
            <fieldset>
              {invitations.map((inv) => (
                <Checkbox
                  key={inv.user.key}
                  label={inv.user.name}
                  labelProps={{ className: "mt-2" }}
                  bind={{
                    value: filters.contact.has(inv.user.key),
                    onChange: (checked) => {
                      const newContact = new Set(filters.contact);
                      if (checked) {
                        newContact.add(inv.user.key);
                      } else {
                        newContact.delete(inv.user.key);
                      }
                      setFiltersField("contact", newContact);
                    },
                  }}
                />
              ))}
            </fieldset>
          </label>
        ) : null}
      </DialogBody>
      <Button mode="primary" onClick={onClickApply}>
        Apply
      </Button>
    </Dialog>
  );
};

export const ForceSyncButton: React.FC = () => {
  const connection = useShareConnection(["readyState", "forceSync"]);
  const isConnected = connection.readyState === ReadyState.Open;

  const { mutateAsync: forceSync, isPending: isForceSyncPending } = useMutation(
    {
      mutationFn: connection.forceSync,
    }
  );

  if (!isConnected) {
    return null;
  }

  return (
    <IconButton
      className={twMerge(
        "bg-transparent",
        isForceSyncPending ? "animate-spin" : "animate-none"
      )}
      onClick={() => forceSync()}
      aria-label="Force Sync"
      icon={<ArrowPathIcon height={24} />}
    />
  );
};

export const ExportButton: React.FC = () => {
  const {
    profile: { name, key },
  } = useShareConnection(["profile"]);

  const { data: event } = useCurrentEvent();
  const { data: incidents, isLoading } = useEventIncidents(event?.sku);

  const onClick = useCallback(() => {
    const sku = event?.sku ?? "";
    const timestamp = new Date().toISOString();

    const data = JSON.stringify(
      {
        meta: {
          version: __REFEREE_FYI_VERSION__,
          sku,
          timestamp,
          user: { name, key },
        },
        incidents,
      },
      null,
      4
    );

    const blob = new Blob([data], { type: "text/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.setAttribute("download", `incidents-${sku}-${timestamp}.json`);
    a.click();
  }, [event?.sku, incidents, key, name]);

  return !isLoading ? (
    <IconButton
      className={twMerge("bg-transparent")}
      onClick={onClick}
      aria-label="Export Incidents"
      icon={<ArrowDownTrayIcon height={24} />}
    />
  ) : null;
};

export const EventSummaryPage: React.FC = () => {
  const { data: event } = useCurrentEvent();
  const { data: game } = useRulesForEvent(event);
  const { mutateAsync: addEvent, isSuccess } = useAddEventVisited();

  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const { data: allIncidents } = useEventIncidents(event?.sku);

  const incidents = useMemo(() => {
    const results = allIncidents?.filter((incident) => {
      if (!filters.outcomes[incident.outcome]) {
        return false;
      }

      const hasRule =
        filters.rules.length < 1 ||
        filters.rules.some((rule) => incident.rules.includes(rule.rule));
      if (!hasRule) {
        return false;
      }

      const people = new Set<string>();
      for (const register of Object.values(incident.consistency)) {
        people.add(register.peer);
        for (const item of register.history) {
          people.add(item.peer);
        }
      }

      if (filters.contact.size > 0) {
        let hasMatch = false;
        for (const person of people) {
          if (filters.contact.has(person)) {
            hasMatch = true;
            break;
          }
        }
        if (!hasMatch) {
          return false;
        }
      }

      if (filters.flag?.judge && !incident.flags.includes("judge")) {
        return false;
      }

      // Division Filter
      if (typeof filters.division !== "number") {
        return true;
      }

      if (!incident.match) {
        return false;
      }

      if (incident.match.type !== "match") {
        return false;
      }
      return incident.match.division === filters.division;
    });

    return results ?? [];
  }, [allIncidents, filters]);

  const commonRules = useMemo(() => {
    if (!incidents) {
      return [];
    }

    const ruleCounts: Record<string, number> = {};
    for (const { rules } of incidents) {
      for (const rule of rules) {
        if (ruleCounts[rule]) {
          ruleCounts[rule]++;
        } else {
          ruleCounts[rule] = 1;
        }
      }
    }

    return Object.entries(ruleCounts).sort((a, b) => b[1] - a[1]);
  }, [incidents]);

  useEffect(() => {
    if (event && !isSuccess) {
      addEvent(event);
    }
  }, [event, isSuccess, addEvent]);

  if (!event || !game) {
    return <Spinner show />;
  }

  return (
    <>
      <FilterDialog
        open={filterDialogOpen}
        setOpen={setFilterDialogOpen}
        apply={(filters) => setFilters(filters)}
      />
      <section className="mt-4 flex flex-col max-h-full">
        <nav className="flex gap-4 p-2 rounded-md">
          <p className="flex-1">{incidents?.length} Incidents</p>
          <ForceSyncButton />
          <ExportButton />
          <IconButton
            className="bg-transparent"
            onClick={() => setFilterDialogOpen(true)}
            aria-label="Filter Incidents"
            icon={<AdjustmentsHorizontalIcon height={24} />}
          />
        </nav>
        <section className="flex gap-1 flex-wrap">
          {commonRules.slice(0, 5).map(([rule, count]) => (
            <div
              className="font-mono bg-emerald-900 rounded-lg px-2 py-1 text-sm text-center"
              key={rule}
            >
              <div className="flex gap-x-1">
                {game?.rulesLookup?.[rule]?.icon && (
                  <img
                    alt="Icon"
                    className="max-h-5 max-w-5 object-contain"
                    src={game?.rulesLookup?.[rule]?.icon}
                  ></img>
                )}
                {rule.replace(/[<>]/g, "")}
                <span className="text-emerald-400 pl-1">{count}</span>
              </div>
            </div>
          ))}
        </section>
        <VirtualizedList
          data={incidents}
          options={{ estimateSize: () => 64 }}
          className="flex-1 mt-4"
        >
          {(incident) => (
            <Incident
              incident={incident}
              key={incident.id}
              className="h-14 overflow-hidden"
            />
          )}
        </VirtualizedList>
        <section className="mt-4">
          <LinkButton
            to="/$sku/deleted"
            params={{ sku: event.sku }}
            className="w-full flex items-center"
          >
            <span className="flex-1">Deleted Incidents</span>
            <ArrowRightIcon height={20} className="text-emerald-400" />
          </LinkButton>
        </section>
      </section>
    </>
  );
};

export const Route = createFileRoute("/$sku/summary")({
  component: EventSummaryPage,
});
