import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { queryClient } from "~utils/data/query";
import { getUseEventQueryParams } from "~utils/hooks/robotevents";

const RouteComponent: React.FC = () => {
  return <Outlet />;
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
  pendingMs: 100,
});
