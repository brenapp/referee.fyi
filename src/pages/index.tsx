import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useEventsToday } from "~utils/hooks/robotevents";
import { Button, IconButton, LinkButton } from "~components/Button";
import {
  BookOpenIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { twMerge } from "tailwind-merge";
import { Spinner } from "~components/Spinner";
import { useCurrentDivision, useCurrentEvent } from "~utils/hooks/state";
import {
  Dialog,
  DialogBody,
  DialogCustomHeader,
  DialogHeader,
  DialogMode,
} from "~components/Dialog";
import { ProgramAbbr } from "robotevents/out/endpoints/programs";
import { RulesSelect, Select } from "~components/Input";
import { Rule, useRulesForProgram } from "~utils/hooks/rules";

const EventPicker: React.FC = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const { data: eventsToday, isLoading } = useEventsToday();
  const { data: event } = useCurrentEvent();
  const division = useCurrentDivision();

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
            <h2 className="text-lg font-bold text-white mx-3">Events Today</h2>
            <ul>
              {eventsToday?.map((event) => (
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
      <Button className={twMerge("flex-1")} onClick={onClick}>
        <div
          className="grid items-center gap-2"
          style={{ gridTemplateColumns: "1fr 1.25rem" }}
        >
          <p className="flex-1 overflow-hidden whitespace-nowrap text-ellipsis">
            {event ? event.name : "Select Event"}
            {showDiv && (
              <p className="text-sm text-emerald-400">{selectedDiv?.name}</p>
            )}
          </p>
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
  const [program, setProgram] = useState<ProgramAbbr>();

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
      <Button
        onClick={() => setOpen(true)}
        className="flex items-center aspect-square justify-center"
      >
        <BookOpenIcon height={24} />
      </Button>
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
      <nav className="h-16 flex gap-4 max-w-full">
        <Button onClick={() => navigate(-1)} className="bg-transparent p-0">
          <ChevronLeftIcon height={24} />
        </Button>
        <EventPicker />
        <Rules />
      </nav>
      <Spinner show={isLoading} />
      {!isLoading && <Outlet />}
    </main>
  );
};
