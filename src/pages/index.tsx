import { useState } from "react";
import { Outlet, useNavigate, useParams } from "react-router-dom";
import { useEvent, useEventsToday } from "../utils/hooks/robotevents";
import { Button, IconButton, LinkButton } from "../components/Button";
import {
  BookOpenIcon,
  ChevronDownIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { twMerge } from "tailwind-merge";
import { Spinner } from "../components/Spinner";
import { useCurrentDivision, useCurrentEvent } from "../utils/hooks/state";

const EventPicker: React.FC = ({}) => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const { data: eventsToday } = useEventsToday();
  const { data: event } = useCurrentEvent();
  const division = useCurrentDivision();

  if (open) {
    return (
      <section
        className={twMerge(
          "fixed top-0 bottom-0 left-0 right-0 h-[100dvh] w-screen bg-zinc-900 flex flex-col p-2 gap-2"
        )}
      >
        <nav className="h-16 flex p-2 gap-2 items-center max-w-full">
          <IconButton
            icon={<XMarkIcon height={24} />}
            onClick={() => setOpen(false)}
            className="bg-transparent"
          />
          <h1 className="text-xl text-white">Pick An Event</h1>
        </nav>
        <ul className="flex-1 overflow-y-auto">
          {eventsToday?.map((event) => (
            <li key={event.id}>
              <LinkButton
                to={`/${event.sku}`}
                onClick={() => {
                  setOpen(false);
                }}
                className="w-full mt-2 bg-transparent"
              >
                <p className=" text-sm whitespace-nowrap text-ellipsis overflow-hidden">
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
    );
  }

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
  );
};

export const AppShell: React.FC = () => {
  const { data: event, isLoading } = useCurrentEvent();

  return (
    <main
      className="p-4 w-full h-full grid"
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
