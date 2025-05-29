import { createFileRoute, redirect } from "@tanstack/react-router";
import { queryClient } from "~utils/data/query";
import { getUseEventQueryParams } from "~utils/hooks/robotevents";

const RouteComponent: React.FC = () => {
  return <div>Hello "/$sku"!</div>;
};

export const Route = createFileRoute("/$sku")({
  loader: async ({ params }) => {
    const event = await queryClient.ensureQueryData(
      getUseEventQueryParams(params.sku)
    );

    if (!event) {
      throw redirect({ to: "/" });
    }

    return { event };
  },
  component: RouteComponent,
});
