import "./App.css";
import {
  BookOpenIcon,
  ChevronDownIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { Button, IconButton } from "./components/Button";
import { useState } from "react";
import clsx from "clsx";
import { useEventsToday } from "./utils/hooks/robotevents";
import { type Event } from "robotevents/out/endpoints/events";

type EventPickerProps = {
  event: Event | null;
  setEvent: (event: Event) => void;
};

const EventPicker: React.FC<EventPickerProps> = ({ event }) => {
  const [open, setOpen] = useState(false);

  const eventsToday = useEventsToday();

  if (open) {
    return (
      <section
        className={clsx(
          "fixed top-0 bottom-0 left-0 right-0 h-screen w-screen bg-zinc-800"
        )}
      >
        <nav className="h-20 flex p-2 gap-2 items-center">
          <IconButton
            icon={<XMarkIcon height={24} />}
            onClick={() => setOpen(false)}
          />
          <h1 className="text-xl text-white">Pick An Event</h1>
        </nav>
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

function App() {
  const [event, setEvent] = useState<Event | null>(null);

  return (
    <>
      <nav className="h-20 flex p-2 gap-2">
        <EventPicker event={event} setEvent={setEvent} />
        <IconButton icon={<BookOpenIcon height={24} />} />
      </nav>
    </>
  );
}

export default App;
