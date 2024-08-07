import { QueryClient } from "@tanstack/react-query";
import {
  PersistedQuery,
  experimental_createPersister,
} from "@tanstack/react-query-persist-client";
import { del, get, set } from "~utils/data/keyval";

// Cache buster key, used to forcibly invalidate queries
export const CACHE_BUSTER = "v6";

export const CACHE_PREFIX = "tanstack-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 30,
      persister: experimental_createPersister<PersistedQuery>({
        buster: CACHE_BUSTER,
        serialize: (query) => query,
        deserialize: (query) => query,
        prefix: CACHE_PREFIX,
        storage: {
          getItem: get,
          setItem: set,
          removeItem: del,
        },
      }),
    },
  },
});
