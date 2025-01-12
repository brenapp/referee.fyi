import { init, browserTracingIntegration, setUser } from "@sentry/react";
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

const client = init({
  dsn: "https://0aecdc6c41674e7cf3b4a39ec939ed9c@o4507708571910144.ingest.us.sentry.io/4507708573286400",
  integrations: [browserTracingIntegration()],
  attachStacktrace: true,
  environment: import.meta.env.MODE,
  enabled:
    import.meta.env.MODE === "production" ||
    import.meta.env.VITE_REFEREE_FYI_ENABLE_SENTRY,
  // Performance Monitoring
  tracesSampleRate: 1.0, //  Capture 100% of the transactions
  // Set 'tracePropagationTargets' to control for which URLs distributed tracing should be enabled
  tracePropagationTargets: [],
  // Session Replay
  replaysSessionSampleRate: 0.1, // This sets the sample rate at 10%. You may want to change it to 100% while in development and then sample at a lower rate in production.
  replaysOnErrorSampleRate: 1.0, // If you're not already sampling the entire session, change the sample rate to 100% when sampling sessions where errors occur.
});

window.addEventListener("load", async () => {
  if (import.meta.env.PROD) {
    const { replayIntegration } = await import("@sentry-internal/replay");
    client?.addIntegration(replayIntegration);
  }

  // Initialize user
  const profile = await getShareProfile();
  if (profile) {
    setUser({
      id: profile.key,
      username: profile.name,
    });
  }
});
