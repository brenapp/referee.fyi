import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  currentSeasons,
  useCurrentSeason,
  useEvent,
  useEventSearch,
  useSeason,
} from "~utils/hooks/robotevents";
import { Button, IconButton, LinkButton } from "~components/Button";
import {
  BookOpenIcon,
  ChevronDownIcon,
  XMarkIcon,
  ChevronLeftIcon,
} from "@heroicons/react/24/outline";
import { Spinner } from "~components/Spinner";
import { useCurrentDivision, useCurrentEvent } from "~utils/hooks/state";
import {
  Dialog,
  DialogBody,
  DialogCustomHeader,
  DialogHeader,
} from "~components/Dialog";
import { ProgramCode } from "robotevents";
import { Input, RulesSelect } from "~components/Input";
import { Rule, useRulesForSeason } from "~utils/hooks/rules";
import { Toaster } from "react-hot-toast";
import { useEventInvitation } from "~utils/hooks/share";
import { useShareConnection } from "~models/ShareConnection";
import { useMutation } from "@tanstack/react-query";
import { runMigrations } from "../migrations";
import { toast } from "~components/Toast";
import { getShareProfile } from "~utils/data/share";

function isValidSKU(sku: string) {
  return !!sku.match(
    /RE-(VRC|V5RC|VEXU|VURC|VIQRC|VIQC|VAIRC|ADC)-[0-9]{2}-[0-9]{4}/g
  );
}

const EventPicker: React.FC = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const [query, setQuery] = useState("");
  const { data: eventFromSKU, isLoading: isLoadingEventFromSKU } = useEvent(
    query,
    { enabled: isValidSKU(query) }
  );

  const start = useRef(
    new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString()
  );
  const [end, setEnd] = useState(
    new Date(Date.now() + 1000 * 60 * 60 * 24 * 7)
  );
  const onClickMore = useCallback(() => {
    setEnd((end) => new Date(end.getTime() + 1000 * 60 * 60 * 24 * 31));
  }, [setEnd]);

  const { data: events, isLoading: isLoadingEvents } = useEventSearch({
    "season[]": currentSeasons,
    "eventTypes[]": ["tournament"],
    start: start.current,
    end: end.toISOString(),
  });
  const { data: event } = useCurrentEvent();
  const division = useCurrentDivision();

  const results = useMemo(() => {
    if (!query) {
      return events ?? [];
    }

    return (
      events?.filter((event) => {
        if (event.name.toUpperCase().includes(query)) {
          return true;
        }

        if (event.sku.toUpperCase().includes(query)) {
          return true;
        }

        if (event.location.venue?.toUpperCase().includes(query)) {
          return true;
        }
      }) ?? []
    );
  }, [query, events]);

  useEffect(() => {
    const maxTime = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30 * 3);

    const shouldLoadMore =
      query.length > 3 &&
      !isLoadingEvents &&
      results.length < 1 &&
      end < maxTime;

    if (shouldLoadMore) {
      onClickMore();
    }
  }, [query, results, isLoadingEvents, onClickMore, end]);

  const selectedDiv = event?.divisions?.find((d) => d.id === division);
  const showDiv =
    location.pathname !== `/${event?.sku}` &&
    (event?.divisions?.length ?? 0) > 1;

  const onClick = () => {
    if (showDiv) {
      navigate(`/${event?.sku}`);
    } else {
      setOpen(true);
    }
  };

  return (
    <>
      <Dialog
        open={open}
        mode="modal"
        onClose={() => setOpen(false)}
        aria-label="Pick an Event"
      >
        <DialogHeader title="Pick An Event" onClose={() => setOpen(false)} />
        <DialogBody>
          <Spinner show={isLoadingEvents} />
          <section>
            <h2 className="text-lg font-bold text-white mx-2">Search</h2>
            <Input
              type="text"
              placeholder="SKU or Event Name"
              className="font-mono px-4 py-4 rounded-md invalid:bg-red-500 w-full"
              value={query}
              onChange={(e) => setQuery(e.currentTarget.value.toUpperCase())}
            />
            <Spinner show={isLoadingEventFromSKU} />
            {eventFromSKU && (
              <>
                <div className="p-2 pt-4">
                  <p className="text-sm whitespace-nowrap text-ellipsis overflow-hidden">
                    <span className=" text-emerald-400 font-mono">
                      {eventFromSKU.sku}
                    </span>
                    {" • "}
                    <span>{eventFromSKU.location.venue}</span>
                  </p>
                  <p className="whitespace-nowrap text-ellipsis overflow-hidden">
                    {eventFromSKU.name}
                  </p>
                </div>
                <LinkButton
                  to={`/${eventFromSKU.sku}`}
                  onClick={() => setOpen(false)}
                  className="mt-4 bg-emerald-600 w-full text-center"
                >
                  Go
                </LinkButton>
              </>
            )}
          </section>
          <p className="italic text-center py-4">Or</p>
          <section>
            <h2 className="text-lg font-bold text-white mx-2">Events</h2>
            <ul>
              {results?.map((event) => (
                <li
                  key={event.sku}
                  aria-label={`${event.name} at ${event.location.venue}. ${event.sku}`}
                >
                  <LinkButton
                    to={`/${event.sku}`}
                    onClick={() => {
                      setOpen(false);
                    }}
                    className="w-full mt-2 bg-transparent"
                  >
                    <p className="text-sm whitespace-nowrap text-ellipsis overflow-hidden">
                      <span className=" text-emerald-400 font-mono">
                        {event.sku}
                      </span>
                      {" • "}
                      <span>{event.location.venue}</span>
                    </p>
                    <p className="whitespace-nowrap text-ellipsis overflow-hidden">
                      {event.name}
                    </p>
                  </LinkButton>
                </li>
              ))}
            </ul>
            <Button onClick={onClickMore} mode="normal" className="mt-2">
              Load More
            </Button>
            <Spinner show={isLoadingEvents} />
          </section>
        </DialogBody>
      </Dialog>
      <Button
        mode="none"
        className="flex-1 active:bg-zinc-600"
        onClick={onClick}
        aria-description={
          "Click to " + showDiv ? "Select Division" : "Select Event"
        }
      >
        <div
          className="grid items-center gap-2"
          style={{ gridTemplateColumns: "1fr 1.25rem" }}
        >
          <div className="flex-1 overflow-hidden whitespace-nowrap text-ellipsis">
            <p>{event ? event.name : "Select Event"}</p>
            <p className="text-sm text-emerald-400">
              {showDiv ? <span>{selectedDiv?.name}</span> : event?.sku}
            </p>
          </div>
          <ChevronDownIcon className="w-5 h-5" />
        </div>
      </Button>
    </>
  );
};

const Rules: React.FC = () => {
  const { data: event } = useCurrentEvent();

  const [open, setOpen] = useState(false);
  const program = useMemo(() => event?.program.id as ProgramCode, [event]);

  const { data: currentSeasonForProgram } = useCurrentSeason(program);
  const { data: season } = useSeason(event?.season.id);
  const { data: rules } = useRulesForSeason(season ?? currentSeasonForProgram);

  const [rule, setRule] = useState<Rule | null>(null);

  const onClose = useCallback(() => {
    setRule(null);
    setOpen(false);
  }, []);

  if (!program || !event) {
    return null;
  }

  return (
    <>
      <Dialog
        open={open}
        mode="modal"
        onClose={onClose}
        aria-label="Rules Reference"
      >
        <DialogCustomHeader>
          <IconButton
            icon={<XMarkIcon height={24} />}
            onClick={onClose}
            className="bg-transparent"
            autoFocus
          />
          <RulesSelect
            game={rules}
            rule={rule}
            setRule={setRule}
            className="w-full"
          />
        </DialogCustomHeader>
        <DialogBody className="px-2 flex gap-5 flex-col">
          <section className="bg-white flex-1 rounded-md">
            <iframe
              key={program}
              src={rule?.link ?? "about:blank"}
              className="w-full h-full"
            ></iframe>
          </section>
        </DialogBody>
      </Dialog>
      <IconButton
        onClick={() => setOpen(true)}
        icon={<BookOpenIcon height={24} />}
        aria-label="Rules Reference"
      />
    </>
  );
};

const ConnectionManager: React.FC = () => {
  const { data: event } = useCurrentEvent();
  const { data: invitation } = useEventInvitation(event?.sku);

  const { connect, disconnect, updateProfile } = useShareConnection([
    "connect",
    "disconnect",
    "updateProfile",
  ]);

  useEffect(() => {
    if (invitation) {
      connect(invitation);
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [connect, disconnect, invitation]);

  useEffect(() => {
    async function update() {
      const profile = await getShareProfile();
      updateProfile(profile);
    }
    update();
  }, [updateProfile]);

  return null;
};

const MigrationManager: React.FC = () => {
  const { mutateAsync } = useMutation({
    mutationFn: runMigrations,
    onSuccess(data) {
      const applied = Object.values(data).filter(
        (result) => !result.preapplied
      );

      if (applied.length > 0) {
        toast({ type: "info", message: "Applied Migrations!" });
      }
    },
  });

  useEffect(() => {
    mutateAsync();
  }, [mutateAsync]);

  return null;
};

export const AppShell: React.FC = () => {
  const { isLoading } = useCurrentEvent();
  const navigate = useNavigate();

  return (
    <main
      className="w-screen h-[100dvh] grid mb-4 p-4 overflow-hidden"
      style={{
        gridTemplateRows: "4rem minmax(0, 1fr)",
        gridTemplateColumns: "calc(100dvw - 32px)",
      }}
    >
      <Toaster containerClassName="mb-16" />
      <ConnectionManager />
      <MigrationManager />
      <nav className="h-16 flex gap-4 max-w-full">
        <IconButton
          onClick={() => navigate(-1)}
          icon={<ChevronLeftIcon height={24} />}
          className="aspect-auto bg-transparent"
          aria-label="Back"
        />
        <EventPicker />
        <Rules />
      </nav>
      <Spinner show={isLoading} />
      {!isLoading && <Outlet />}
    </main>
  );
};
