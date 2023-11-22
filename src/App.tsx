import "./App.css";
import {
  BookOpenIcon,
  ChevronDownIcon,
  ExclamationTriangleIcon,
  FlagIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { Button, IconButton } from "./components/Button";
import { useState } from "react";
import clsx from "clsx";
import { useEventTeams, useEventsToday } from "./utils/hooks/robotevents";
import { type Event } from "robotevents/out/endpoints/events";
import { Input } from "./components/Input";
import { Spinner } from "./components/Spinner";
import { Tabs } from "./components/Tabs";

type EventPickerProps = {
  event: Event | null;
  setEvent: (event: Event) => void;
};

const EventPicker: React.FC<EventPickerProps> = ({ event, setEvent }) => {
  const [open, setOpen] = useState(false);

  const { data: eventsToday } = useEventsToday();

  if (open) {
    return (
      <section
        className={clsx(
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
              <Button
                onClick={() => {
                  setEvent(event);
                  setOpen(false);
                }}
                className="w-full mt-2 bg-zinc-800"
              >
                {event.name}
              </Button>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  return (
    <Button className={clsx("flex-1")} onClick={() => setOpen(true)}>
      <div className="flex items-center">
        <span className="flex-1">{event ? event.name : "Select Event"}</span>
        <ChevronDownIcon className="w-5 h-5" />
      </div>
    </Button>
  );
};

type MainTabProps = {
  event: Event;
};

const EventTeamsTab: React.FC<MainTabProps> = ({ event }) => {
  const { data: teams, isLoading } = useEventTeams(event);

  return (
    <section className="flex-1 flex flex-col gap-4">
      <Spinner show={isLoading} />
      <ul className="flex-1 overflow-y-auto">
        {teams?.map((team) => (
          <li
            key={team.number}
            className="flex items-center gap-4 mt-4 h-12 text-zinc-50"
          >
            <div className="flex-1">
              <p className="text-emerald-400 font-mono">{team.number}</p>
              <p>{team.team_name}</p>
            </div>
            <p className="h-full w-32 px-2 flex items-center">
              <span className="text-red-400 mr-4">
                <FlagIcon height={24} className="inline" />
                <span className="font-mono ml-2">0</span>
              </span>
              <span className="text-yellow-400">
                <ExclamationTriangleIcon height={24} className="inline" />
                <span className="font-mono ml-2">0</span>
              </span>
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
};

function App() {
  const [event, setEvent] = useState<Event | null>(null);

  return (
    <main className="p-4">
      <nav className="h-16 flex gap-4 max-w-full">
        <EventPicker event={event} setEvent={setEvent} />
        <IconButton icon={<BookOpenIcon height={24} />} />
      </nav>
      {event ? (
        <Tabs className="mt-4">
          {{
            Teams: <EventTeamsTab event={event} />,
            Matches: <p className="text-zinc-50">Matches</p>,
          }}
        </Tabs>
      ) : null}
    </main>
  );
}

export default App;
