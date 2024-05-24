import { QueryClient } from "@tanstack/react-query";
import {
  PersistedQuery,
  experimental_createPersister,
} from "@tanstack/react-query-persist-client";
import { del, get, set } from "idb-keyval";

// Cache buster key, used to forcibly invalidate queries
export const CACHE_BUSTER = "v6";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 30,
      persister: experimental_createPersister<PersistedQuery>({
        buster: CACHE_BUSTER,
        serialize: (query) => query,
        deserialize: (query) => query,
        storage: {
          getItem: get,
          setItem: set,
          removeItem: del,
        },
      }),
    },
  },
});
