import React from "react";
import { Navigate } from "react-router-dom";
import { LinkButton } from "~components/Button";
import { Spinner } from "~components/Spinner";
import { useCurrentEvent } from "~hooks/state";

export const EventDivisionPickerPage: React.FC = () => {
  const { data: event } = useCurrentEvent({
    networkMode: "always",
    refetchOnMount: "always",
  });

  if (event?.divisions?.length === 1) {
    return <Navigate to={`/${event.sku}/${event.divisions[0].id}`} replace />;
  }

  if (!event) {
    return <Spinner show />;
  }

  return (
    <section className="mt-4 flex flex-col gap-4 overflow-auto max-h-screen">
      <ol className="contents">
        {event.divisions
          ?.sort((a, b) => a.order! - b.order!)
          .map((division) => (
            <li key={division.id}>
              <LinkButton
                className={"w-full"}
                to={`/${event.sku}/${division.id}`}
              >
                {division.name}
              </LinkButton>
            </li>
          ))}
        <li>
          <LinkButton className={"w-full"} to={`/${event.sku}/skills`}>
            Skills
          </LinkButton>
        </li>
      </ol>
    </section>
  );
};
