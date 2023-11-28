import { useState } from "react";
import { Outlet, useParams } from "react-router-dom";
import { useEvent, useEventsToday } from "../utils/hooks/robotevents";
import { Button, IconButton, LinkButton } from "../components/Button";
import {
  BookOpenIcon,
  ChevronDownIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { twMerge } from "tailwind-merge";
import { Spinner } from "../components/Spinner";

const EventPicker: React.FC = ({}) => {
  const [open, setOpen] = useState(false);
  const { sku } = useParams();

  const { data: eventsToday } = useEventsToday();
  const { data: event } = useEvent(sku ?? "");

  if (open) {
    return (
      <section
        className={twMerge(
          "fixed top-0 bottom-0 left-0 right-0 h-[100dvh] w-screen bg-zinc-700 flex flex-col p-2 gap-2"
        )}
      >
        <nav className="h-16 flex p-2 gap-2 items-center max-w-full">
          <IconButton
            icon={<XMarkIcon height={24} />}
            onClick={() => setOpen(false)}
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
                className="w-full mt-2 bg-zinc-800"
              >
                {event.name}
              </LinkButton>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  return (
    <Button className={twMerge("flex-1")} onClick={() => setOpen(true)}>
      <div
        className="grid items-center gap-2"
        style={{ gridTemplateColumns: "1fr 1.25rem" }}
      >
        <p className="flex-1 overflow-hidden whitespace-nowrap text-ellipsis">
          {event ? event.name : "Select Event"}
        </p>
        <ChevronDownIcon className="w-5 h-5" />
      </div>
    </Button>
  );
};

export const AppShell: React.FC = () => {
  const { sku } = useParams();
  const { data: event, isLoading } = useEvent(sku ?? "");

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
      <Outlet />
    </main>
  );
};
