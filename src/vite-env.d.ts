/// <reference types="vite/client" />

declare const __REFEREE_FYI_VERSION__: string;

interface ImportMetaEnv {
  readonly VITE_REFEREE_FYI_SHARE_SERVER: string;
  readonly VITE_REFEREE_FYI_BUILD_MODE: "WC" | "STANDARD";
  readonly VITE_REFEREE_FYI_RULES_SERVER: string;
  readonly VITE_REFEREE_FYI_ENABLE_SENTRY: boolean;
  readonly VITE_ROBOTEVENTS_TOKEN: string;
  readonly VITE_LOGSERVER_TOKEN: string;
}

declare module "*.md" {
  const attributes: Record<string, unknown>;

  const toc: { level: string; content: string }[];
  const html: string;
  const raw: string;

  import React from "react";
  const ReactComponent: React.VFC;

  import { ComponentOptions, Component } from "vue";
  const VueComponent: ComponentOptions;
  const VueComponentWith: (
    components: Record<string, Component>
  ) => ComponentOptions;

  export {
    attributes,
    toc,
    html,
    ReactComponent,
    VueComponent,
    VueComponentWith,
  };
}
