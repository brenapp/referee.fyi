const STORES: Record<symbol, unknown> = {};

export type ExternalStoreCallback = () => void;

export type ExternalStore<T> = {
  getSnapshot(): T;
  set(value: T): void;
  subscribe(callback: ExternalStoreCallback): () => void;
};

export function externalStore<T>(init: T): ExternalStore<T> {
  const symbol = Symbol();
  const callbacks: ExternalStoreCallback[] = [];

  return {
    getSnapshot() {
      const value = STORES[symbol] as T | undefined;
      if (value !== undefined) {
        return value;
      }
      STORES[symbol] = init;
      return init;
    },
    set(value: T) {
      STORES[symbol] = value;
      callbacks.forEach((callback) => callback());
    },
    subscribe(callback) {
      const index = callbacks.push(callback);
      return () => {
        callbacks.splice(index - 1, 1);
      };
    },
  };
}
