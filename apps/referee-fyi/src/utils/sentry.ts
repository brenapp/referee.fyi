import type { MeasurementUnit, User } from "@sentry/core";
import {
	browserTracingIntegration,
	init,
	setMeasurement,
	setUser,
} from "@sentry/react";
import { getGeolocation } from "./data/meta";
import { queryClient } from "./data/query";
import { getShareProfile } from "./data/share";

export async function clearCache() {
	// Invalidate All Queries
	await queryClient.invalidateQueries({ type: "all" });

	// Unregister Service Workers
	if ("serviceWorker" in navigator) {
		const registrations = await navigator.serviceWorker.getRegistrations();
		for (const registration of registrations) {
			await registration.unregister();
		}
	}

	// Reload
	window.location.reload();
}

const enabled =
	import.meta.env.MODE === "production" ||
	import.meta.env.VITE_REFEREE_FYI_ENABLE_SENTRY;

export const client = enabled
	? init({
			dsn: "https://0aecdc6c41674e7cf3b4a39ec939ed9c@o4507708571910144.ingest.us.sentry.io/4507708573286400",
			integrations: [browserTracingIntegration()],
			attachStacktrace: true,
			environment: import.meta.env.MODE,
			enabled,
			// Performance Monitoring
			tracesSampleRate: 1.0, //  Capture 100% of the transactions
			// Set 'tracePropagationTargets' to control for which URLs distributed tracing should be enabled
			tracePropagationTargets: ["localhost", /^https:\/\/referee\.fyi\/api/],
		})
	: null;

window.addEventListener("load", async () => {
	// Initialize user
	const profile = await getShareProfile();
	const geo = await getGeolocation();
	if (profile) {
		setTracingProfile({
			id: profile.key,
			username: profile.name,
			geo: {
				city: geo?.city,
				region: geo?.region,
				country_code: geo?.country,
			},
		});
	}
});

export function reportMeasurement(
	name: string,
	value: number,
	unit: MeasurementUnit,
) {
	return setMeasurement(name, value, unit);
}

export function measure(name: string, executor: () => void) {
	const start = performance.now();
	executor();
	const end = performance.now();

	const duration = end - start;
	reportMeasurement(name, duration, "millisecond");
	return duration;
}

let currentUser: User = {};

export async function setTracingProfile(user: User) {
	const updated = { ...currentUser, user };
	currentUser = updated;
	setUser(currentUser);
}
