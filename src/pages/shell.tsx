import { useEffect, useMemo, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useEvent, useEventsToday } from "~utils/hooks/robotevents";
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
import { ButtonMode, DialogMode } from "~components/constants";
import { ProgramAbbr } from "robotevents/out/endpoints/programs";
import { Input, RulesSelect, Select } from "~components/Input";
import { Rule, useRulesForProgram } from "~utils/hooks/rules";
import { Toaster } from "react-hot-toast";

function isValidSKU(sku: string) {
  return !!sku.match(/RE-(VRC|VIQRC|VEXU|VIQC)-[0-9]{2}-[0-9]{4}/g);
}

const EventPicker: React.FC = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const { data: eventFromSKU, isLoading: isLoadingEventFromSKU } = useEvent(
    query,
    { enabled: isValidSKU(query) }
  );

  const { data: eventsToday, isLoading } = useEventsToday();
  const { data: event } = useCurrentEvent();
  const division = useCurrentDivision();

  const results = useMemo(() => {
    if (!query) {
      return eventsToday ?? [];
    }

    return (
      eventsToday?.filter((event) => {
        if (event.name.toUpperCase().includes(query)) {
          return true;
        }

        if (event.sku.toUpperCase().includes(query)) {
          return true;
        }

        if (event.location.venue.toUpperCase().includes(query)) {
          return true;
        }
      }) ?? []
    );
  }, [query, eventsToday]);

  const selectedDiv = event?.divisions.find((d) => d.id === division);
  const showDiv = selectedDiv && (event?.divisions.length ?? 0) > 1;

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
        mode={DialogMode.Modal}
        onClose={() => setOpen(false)}
      >
        <DialogHeader title="Pick An Event" onClose={() => setOpen(false)} />
        <DialogBody>
          <Spinner show={isLoading} />
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
                <li key={event.id}>
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
          </section>
        </DialogBody>
      </Dialog>
      <Button
        mode={ButtonMode.None}
        className="flex-1 active:bg-zinc-600"
        onClick={onClick}
      >
        <div
          className="grid items-center gap-2"
          style={{ gridTemplateColumns: "1fr 1.25rem" }}
        >
          <div className="flex-1 overflow-hidden whitespace-nowrap text-ellipsis">
            <p>{event ? event.name : "Select Event"}</p>
            {showDiv && (
              <p className="text-sm text-emerald-400">{selectedDiv?.name}</p>
            )}
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
  const programs: ProgramAbbr[] = ["VRC", "VIQRC", "VEXU", "VAIC"];
  const [program, setProgram] = useState<ProgramAbbr>("VRC");

  const rules = useRulesForProgram(program);
  const [rule, setRule] = useState<Rule | null>(null);

  useEffect(() => {
    if (program) {
      setRule(null);
    }
  }, [program]);

  useEffect(() => {
    if (event) {
      setProgram(event.program.code);
    }
  }, [event]);

  return (
    <>
      <Dialog
        open={open}
        mode={DialogMode.Modal}
        onClose={() => setOpen(false)}
      >
        <DialogCustomHeader>
          <IconButton
            icon={<XMarkIcon height={24} />}
            onClick={() => setOpen(false)}
            className="bg-transparent"
            autoFocus
          />
          <Select
            value={program}
            onChange={(e) => setProgram(e.target.value as ProgramAbbr)}
            className="flex-1"
          >
            {programs.map((program) => (
              <option key={program} value={program}>
                {program}
              </option>
            ))}
          </Select>
        </DialogCustomHeader>
        <DialogBody className="px-2 flex gap-5 flex-col">
          <RulesSelect
            game={rules}
            rule={rule}
            setRule={setRule}
            className="w-full"
          />
          <section className="p-4 bg-white flex-1 rounded-md">
            <iframe
              src={rule?.link ?? "about:blank"}
              className="w-full h-full"
            ></iframe>
          </section>
        </DialogBody>
      </Dialog>
      <IconButton
        onClick={() => setOpen(true)}
        icon={<BookOpenIcon height={24} />}
      />
    </>
  );
};

export const AppShell: React.FC = () => {
  const { isLoading } = useCurrentEvent();
  const navigate = useNavigate();

  return (
    <main
      className="p-4 w-screen h-screen grid"
      style={{ gridTemplateRows: "4rem 1fr" }}
    >
      <Toaster />
      <nav className="h-16 flex gap-4 max-w-full">
        <IconButton
          onClick={() => navigate(-1)}
          icon={<ChevronLeftIcon height={24} />}
          className="aspect-auto bg-transparent"
        />
        <EventPicker />
        <Rules />
      </nav>
      <Spinner show={isLoading} />
      {!isLoading && <Outlet />}
    </main>
  );
};
