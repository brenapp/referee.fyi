/// <reference types="vite/client" />

declare const __REFEREE_FYI_VERSION__: string;

interface ImportMetaEnv {
  readonly VITE_REFEREE_FYI_SHARE_SERVER: string;
  readonly VITE_REFEREE_FYI_BUILD_MODE: "WC" | "STANDARD";
  readonly VITE_REFEREE_FYI_ENABLE_SENTRY: boolean;
  readonly VITE_ROBOTEVENTS_TOKEN: string;
  readonly VITE_LOGSERVER_TOKEN: string;
}
