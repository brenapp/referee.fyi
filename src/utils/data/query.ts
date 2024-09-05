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
        prefix: CACHE_PREFIX,
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

export type CreatePersisterOptions<S, D> = {
  serialize: (data: D) => S;
  deserialize: (data: S) => D;
};

export function createPersister<S, D>({
  serialize: serializeData,
  deserialize: deserializeData,
}: CreatePersisterOptions<S, D>) {
  const serialize = (query: PersistedQuery) => {
    const data = serializeData(query.state.data as D);
    return { ...query, state: { ...query.state, data } };
  };

  const deserialize = (query: PersistedQuery) => {
    const data = deserializeData(query.state.data as S);
    return { ...query, state: { ...query.state, data } };
  };

  return experimental_createPersister<PersistedQuery>({
    buster: CACHE_BUSTER,
    prefix: CACHE_PREFIX,
    serialize,
    deserialize,
    storage: {
      getItem: get,
      setItem: set,
      removeItem: del,
    },
  });
}
