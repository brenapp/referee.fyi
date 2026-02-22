import {
	BookOpenIcon,
	ChevronDownIcon,
	ChevronLeftIcon,
} from "@heroicons/react/24/outline";
import { useMutation } from "@tanstack/react-query";
import {
	createRootRoute,
	Outlet,
	useLocation,
	useMatchRoute,
	useNavigate,
	useParams,
	useRouter,
} from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Toaster } from "react-hot-toast";
import type { ProgramAbbr, Year } from "robotevents";
import { Button, IconButton, LinkButton } from "~components/Button";
import { Dialog, DialogBody, DialogHeader } from "~components/Dialog";
import { Input } from "~components/Input";
import { Spinner } from "~components/Spinner";
import { toast } from "~components/Toast";
import { useShareConnection } from "~models/ShareConnection";
import { getEventInvitation, getShareProfile } from "~utils/data/share";
import { useGeolocation } from "~utils/hooks/meta";
import {
	currentSeasons,
	useEvent,
	useEventSearch,
	useSeason,
} from "~utils/hooks/robotevents";
import { useEventInvitation } from "~utils/hooks/share";
import { useCurrentDivision, useCurrentEvent } from "~utils/hooks/state";
import { runMigrations } from "../migrations";

function isValidSKU(sku: string) {
	return !!sku.match(
		/RE-(VRC|V5RC|VEXU|VURC|VIQRC|VIQC|VAIRC|ADC)-[0-9]{2}-[0-9]{4}/g,
	);
}

export const EventPicker: React.FC = () => {
	const [open, setOpen] = useState(false);
	const navigate = useNavigate();
	const location = useLocation();

	const { data: geo } = useGeolocation();

	const [query, setQuery] = useState("");
	const { data: eventFromSKU, isLoading: isLoadingEventFromSKU } = useEvent(
		query,
		{ enabled: isValidSKU(query) },
	);

	const start = useRef(
		new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
	);
	const [end, setEnd] = useState(
		new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
	);
	const onClickMore = useCallback(() => {
		setEnd((end) => new Date(end.getTime() + 1000 * 60 * 60 * 24 * 31));
	}, [setEnd]);

	const { data: events, isPending: isLoadingEvents } = useEventSearch(
		{
			"season[]": currentSeasons,
			start: start.current,
			end: end.toISOString(),
		},
		{
			placeholderData: (prev) => prev,
		},
	);

	const { sku: skuParam } = useParams({ strict: false });

	const { data: event, isPending: isPendingCurrentEvent } = useCurrentEvent();
	const division = useCurrentDivision();

	const sku = event?.sku ?? (skuParam && isValidSKU(skuParam) ? skuParam : "");

	const results = useMemo(() => {
		if (!query) {
			return events ?? [];
		}

		return (
			events?.filter((event) => {
				if (event.name.toUpperCase().includes(query)) {
					return true;
				}

				if (event.sku.toUpperCase().includes(query)) {
					return true;
				}

				if (event.location.venue?.toUpperCase().includes(query)) {
					return true;
				}
			}) ?? []
		);
	}, [query, events]);

	const regionResults = useMemo(() => {
		if (!geo?.region || !geo.country) {
			return [];
		}

		if (geo.country === "United States") {
			return results.filter((event) => event.location.region === geo.region);
		}

		return results.filter((event) => event.location.country === geo.country);
	}, [geo?.region, geo?.country, results]);

	useEffect(() => {
		const maxTime = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30 * 3);

		const shouldLoadMore =
			query.length > 3 &&
			!isLoadingEvents &&
			results.length < 1 &&
			end < maxTime;

		if (shouldLoadMore) {
			onClickMore();
		}
	}, [query, results, isLoadingEvents, onClickMore, end]);

	const selectedDiv = event?.divisions?.find((d) => d.id === division);
	const showDiv =
		location.pathname !== `/${event?.sku}` &&
		(event?.divisions?.length ?? 0) > 1;

	const onClick = () => {
		if (showDiv && event) {
			navigate({ to: "/$sku", params: { sku: event.sku } });
		} else {
			setOpen(true);
		}
	};

	return (
		<>
			<Dialog
				open={open}
				mode="modal"
				onClose={() => setOpen(false)}
				aria-label="Pick an Event"
			>
				<DialogHeader title="Pick An Event" onClose={() => setOpen(false)} />
				<DialogBody>
					<Spinner show={isLoadingEvents} />
					<section>
						<h2 className="text-lg font-bold text-white mx-2">Search</h2>
						<Input
							id="search"
							type="text"
							placeholder="SKU or Event Name"
							className="font-mono px-4 py-4 rounded-md invalid:bg-red-500 w-full mt-2"
							value={query}
							onChange={(e) => setQuery(e.currentTarget.value.toUpperCase())}
						/>
						<Spinner show={isLoadingEventFromSKU} />
						{eventFromSKU && (
							<>
								<div className="p-2 pt-4">
									<p className="text-sm whitespace-nowrap text-ellipsis overflow-hidden">
										<span className=" text-emerald-400 font-mono">
											{eventFromSKU.sku}
										</span>
										{" • "}
										<span>{eventFromSKU.location.venue}</span>
									</p>
									<p className="whitespace-nowrap text-ellipsis overflow-hidden">
										{eventFromSKU.name}
									</p>
								</div>
								<LinkButton
									to={"/$sku"}
									params={{ sku: eventFromSKU.sku }}
									onClick={() => setOpen(false)}
									className="mt-4 bg-emerald-600 w-full text-center"
								>
									Go
								</LinkButton>
							</>
						)}
					</section>
					{regionResults.length > 0 && geo?.region ? (
						<section className="mt-4">
							<h2 className="text-lg font-bold text-white mx-2">
								{geo.region}
							</h2>
							<ul>
								{regionResults?.map((event) => (
									<li
										key={event.sku}
										aria-label={`${event.name} at ${event.location.venue}. ${event.sku}`}
									>
										<LinkButton
											to={"/$sku"}
											params={{ sku: event.sku }}
											onClick={() => {
												setOpen(false);
											}}
											className="w-full mt-2 bg-transparent"
										>
											<p className="text-sm whitespace-nowrap text-ellipsis overflow-hidden">
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
					) : null}
					<section className="mt-4">
						<h2 className="text-lg font-bold text-white mx-2">Events</h2>
						<ul>
							{results?.map((event) => (
								<li
									key={event.sku}
									aria-label={`${event.name} at ${event.location.venue}. ${event.sku}`}
								>
									<LinkButton
										to={"/$sku"}
										params={{ sku: event.sku }}
										onClick={() => {
											setOpen(false);
										}}
										className="w-full mt-2 bg-transparent"
									>
										<p className="text-sm whitespace-nowrap text-ellipsis overflow-hidden">
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
						<Spinner show={isLoadingEvents} />
						<Button onClick={onClickMore} mode="normal" className="mt-2">
							Load More
						</Button>
					</section>
				</DialogBody>
			</Dialog>
			<Button
				mode="none"
				className="flex-1 active:bg-zinc-600"
				onClick={onClick}
				aria-description={
					"Click to " + showDiv ? "Select Division" : "Select Event"
				}
			>
				<div
					className="grid items-center gap-2"
					style={{ gridTemplateColumns: "1fr 1.25rem" }}
				>
					<div className="flex-1 overflow-hidden whitespace-nowrap text-ellipsis">
						<p
							style={{
								visibility: sku && isPendingCurrentEvent ? "hidden" : "visible",
							}}
						>
							{event?.name ??
								(sku && isPendingCurrentEvent
									? "Loading Event..."
									: "Select Event")}
						</p>
						<p className="text-sm text-emerald-400">
							{showDiv ? <span>{selectedDiv?.name}</span> : sku}
						</p>
					</div>
					<ChevronDownIcon className="w-5 h-5" />
				</div>
			</Button>
		</>
	);
};

const Rules: React.FC = () => {
	const { data: event } = useCurrentEvent();
	const { data: season } = useSeason(event?.season.id);

	const program = useMemo(() => event?.program.code as ProgramAbbr, [event]);
	const year = useMemo(
		() =>
			(season
				? [season.years_start, season.years_end].join("-")
				: null) as Year | null,
		[season],
	);

	if (!program || !event || !year) {
		return null;
	}

	return (
		<LinkButton
			to="/rules/$program/$year"
			params={{ program, year }}
			aria-label="Rules Reference"
			className="flex items-center justify-center aspect-square"
		>
			<BookOpenIcon height={24} />
		</LinkButton>
	);
};

const ConnectionManager: React.FC = () => {
	const { data: event } = useCurrentEvent();
	const { data: invitation } = useEventInvitation(event?.sku);

	const { connect, disconnect, updateProfile } = useShareConnection([
		"connect",
		"disconnect",
		"updateProfile",
	]);

	useEffect(() => {
		if (invitation) {
			connect(invitation);
		} else {
			disconnect();
		}

		return () => {
			disconnect();
		};
	}, [connect, disconnect, invitation]);

	useEffect(() => {
		async function update() {
			const profile = await getShareProfile();
			updateProfile(profile);
		}
		update();
	}, [updateProfile]);

	useEffect(() => {
		const controller = new AbortController();

		document.addEventListener("visibilitychange", async () => {
			if (!event?.sku) {
				return;
			}

			if (document.visibilityState !== "visible") {
				return;
			}

			const invitation = await getEventInvitation(event.sku);
			if (invitation) {
				toast({ message: "Reconnecting...", type: "info" });
				connect(invitation);
			}
		});

		return () => controller.abort();
	}, [connect, event?.sku]);

	return null;
};

const MigrationManager: React.FC = () => {
	const { mutateAsync } = useMutation({
		mutationFn: runMigrations,
		onSuccess(data) {
			const applied = Object.values(data).filter(
				(result) => !result.preapplied,
			);

			if (applied.length > 0) {
				toast({ type: "info", message: "Applied Migrations!" });
			}
		},
	});

	useEffect(() => {
		mutateAsync();
	}, [mutateAsync]);

	return null;
};

/**
 * Routes that should have an empty shell (no nav, no spinner, etc)
 **/
const emptyShell = ["/wrapped", "/$sku/stats"] as const;

export const AppShell: React.FC = () => {
	const { isLoading } = useCurrentEvent();
	const navigate = useNavigate();
	const router = useRouter();
	const matchRoute = useMatchRoute();

	if (emptyShell.some((path) => matchRoute({ to: path, fuzzy: true }))) {
		return <Outlet />;
	}

	return (
		<main
			className="w-screen h-[100dvh] grid mb-4 p-4 overflow-hidden"
			style={{
				gridTemplateRows: "4rem minmax(0, 1fr)",
				gridTemplateColumns: "calc(100dvw - 32px)",
			}}
		>
			<Toaster containerClassName="mb-16" />
			<ConnectionManager />
			<MigrationManager />
			<nav className="h-16 flex gap-4 max-w-full">
				<IconButton
					onClick={() =>
						router.history.canGoBack()
							? router.history.back()
							: navigate({ to: "/" })
					}
					icon={<ChevronLeftIcon height={24} />}
					className="aspect-auto bg-transparent"
					aria-label="Back"
				/>
				<EventPicker />
				<Rules />
			</nav>
			<Spinner show={isLoading} />
			{!isLoading && <Outlet />}
		</main>
	);
};

export const Route = createRootRoute({
	component: AppShell,
});
