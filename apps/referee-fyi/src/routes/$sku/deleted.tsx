import { createFileRoute } from "@tanstack/react-router";
import { Incident } from "~components/Incident";
import { Spinner } from "~components/Spinner";
import { VirtualizedList } from "~components/VirtualizedList";
import { useEventDeletedIncidents } from "~utils/hooks/incident";
import { useCurrentEvent } from "~utils/hooks/state";

export const EventDeletedIncidentsPage: React.FC = () => {
	const { data: event } = useCurrentEvent();
	const { data: deleted, isPending } = useEventDeletedIncidents(event?.sku);

	return (
		<section className="mt-4 flex flex-col max-h-full">
			<p>{deleted?.length ?? 0} Deleted Incidents</p>
			<Spinner show={isPending} />
			<VirtualizedList
				data={deleted}
				options={{ estimateSize: () => 64 }}
				className="flex-1 mt-4"
			>
				{(incident) => (
					<Incident
						incident={incident}
						key={incident.id}
						readonly
						className="h-14 overflow-hidden"
					/>
				)}
			</VirtualizedList>
		</section>
	);
};

export const Route = createFileRoute("/$sku/deleted")({
	component: EventDeletedIncidentsPage,
});
