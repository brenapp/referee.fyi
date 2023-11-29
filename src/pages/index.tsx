import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useEventsToday } from "../utils/hooks/robotevents";
import { Button, LinkButton } from "../components/Button";
import { BookOpenIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import { twMerge } from "tailwind-merge";
import { Spinner } from "../components/Spinner";
import { useCurrentDivision, useCurrentEvent } from "../utils/hooks/state";
import {
  Dialog,
  DialogBody,
  DialogHeader,
  DialogMode,
} from "../components/Dialog";

const EventPicker: React.FC = ({}) => {
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
      <Dialog open={open} mode={DialogMode.Modal}>
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

export const AppShell: React.FC = () => {
  const { data: event, isLoading } = useCurrentEvent();

  return (
    <main
      className="p-4 w-screen h-screen grid"
      style={{ gridTemplateRows: "4rem 1fr" }}
    >
      <nav className="h-16 flex gap-4 max-w-full">
        <EventPicker />
        <LinkButton
          to={`/rules/${event?.program.code ?? ""}`}
          className="flex items-center aspect-square justify-center"
        >
          <BookOpenIcon height={24} />
        </LinkButton>
      </nav>
      <Spinner show={isLoading} />
      {!isLoading && <Outlet />}
    </main>
  );
};
