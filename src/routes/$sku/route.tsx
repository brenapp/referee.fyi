import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { LinkButton } from "~components/Button";
import { Error } from "~components/Warning";
import { queryClient } from "~utils/data/query";
import { isValidSKU, isRestrictedSKU } from "~utils/data/robotevents";
import { getUseEventQueryParams } from "~utils/hooks/robotevents";

const RouteComponent: React.FC = () => {
  const { event, isRestricted } = Route.useLoaderData();

  if (!event && isRestricted) {
    return (
      <div className="mt-4">
        <Error message="This event is not currently supported.">
          <p className="mt-2">
            Unfortunately, this event is not currently supported in Referee FYI
            due to changes in RobotEvents. We are working to integrate with the
            new competition portal, and will update this page when it is
            available.
          </p>
        </Error>
        <LinkButton to="/" className="mt-4 w-full text-center">
          Return Home
        </LinkButton>
      </div>
    );
  }

  return <Outlet />;
};

export const Route = createFileRoute("/$sku")({
  loader: async ({ params }) => {
    const isValid = isValidSKU(params.sku);
    const isRestricted = isRestrictedSKU(params.sku);
    if (!isValid && !isRestricted) {
      throw redirect({ to: "/" });
    }

    const event = await queryClient.ensureQueryData(
      getUseEventQueryParams(params.sku)
    );

    return { event, isValid, isRestricted };
  },
  component: RouteComponent,
  pendingMs: 100,
});
