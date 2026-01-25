import { createFileRoute, Navigate } from "@tanstack/react-router";
import React from "react";
import { LinkButton } from "~components/Button";
import { Spinner } from "~components/Spinner";
import { useCurrentEvent } from "~hooks/state";

export const EventDivisionPickerPage: React.FC = () => {
  const { data: event } = useCurrentEvent({
    networkMode: "always",
    refetchOnMount: "always",
  });

  if (event?.divisions?.length === 1) {
    return (
      <Navigate
        to="/$sku/$division"
        params={{ sku: event.sku, division: event.divisions[0].id!.toString() }}
        replace
      />
    );
  }

  if (!event) {
    return <Spinner show />;
  }

  return (
    <section className="mt-4 flex flex-col gap-4 overflow-auto max-h-screen">
      <ol className="contents" data-cy="division-list">
        {event.divisions
          ?.sort((a, b) => a.order! - b.order!)
          .map((division) => (
            <li key={division.id}>
              <LinkButton
                className={"w-full"}
                to={"/$sku/$division"}
                params={{
                  sku: event.sku,
                  division: division.id!.toString(),
                }}
              >
                {division.name}
              </LinkButton>
            </li>
          ))}
        <li>
          <LinkButton
            className={"w-full"}
            to={"/$sku/skills"}
            params={{ sku: event.sku }}
          >
            Skills
          </LinkButton>
        </li>
      </ol>
    </section>
  );
};

export const Route = createFileRoute("/$sku/")({
  component: EventDivisionPickerPage,
});
