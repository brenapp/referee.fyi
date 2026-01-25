import { QueryClient } from "@tanstack/react-query";
import {
  AsyncStorage,
  experimental_createQueryPersister,
  PersistedQuery,
} from "@tanstack/react-query-persist-client";
import { get, set, del, createStore } from "idb-keyval";

// Cache buster key, used to forcibly invalidate queries
export const CACHE_BUSTER = "v6";

const store = createStore("referee-fyi", "query-persister");

const storage: AsyncStorage = {
  getItem: (key: string) => get<string>(key, store),
  setItem: (key: string, value: unknown) => set(key, value, store),
  removeItem: (key: string) => del(key, store),
};

const persister = experimental_createQueryPersister({
  buster: CACHE_BUSTER,
  storage,
});

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 30,
      persister: persister.persisterFn,
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

  return experimental_createQueryPersister({
    buster: CACHE_BUSTER,
    serialize,
    deserialize,
    storage: {
      getItem: (key: string) => get<PersistedQuery>(key, store),
      setItem: (key: string, value: unknown) => set(key, value, store),
      removeItem: (key: string) => del(key, store),
    },
  });
}
