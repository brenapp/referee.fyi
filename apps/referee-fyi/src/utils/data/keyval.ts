import { createStore } from "idb-keyval";

import * as kv from "idb-keyval";

const customStore = createStore("keyval-store", "keyval");

export function get<T>(key: IDBValidKey) {
  return kv.get<T>(key, customStore);
}

export function set(key: IDBValidKey, value: unknown) {
  return kv.set(key, value, customStore);
}

export function setMany(entries: [IDBValidKey, unknown][]) {
  return kv.setMany(entries, customStore);
}

export function getMany<T>(entries: IDBValidKey[]) {
  return kv.getMany<T | undefined>(entries, customStore);
}

export function update<T>(
  key: IDBValidKey,
  updater: (old: T | undefined) => T
) {
  return kv.update<T>(key, updater, customStore);
}

export function updateMany<T>(
  keys: IDBValidKey[],
  updater: (entries: [IDBValidKey, T | undefined][]) => [IDBValidKey, T][]
) {
  return customStore("readwrite", async (store) => {
    const oldValues = await Promise.all(
      keys.map((key) => kv.promisifyRequest<T | undefined>(store.get(key)))
    );

    const values = updater(oldValues.map((value, i) => [keys[i], value]));
    values.forEach((entry) => store.put(entry[1], entry[0]));
    return kv.promisifyRequest(store.transaction);
  });
}

export function del(key: IDBValidKey) {
  return kv.del(key, customStore);
}

export function delMany(key: IDBValidKey[]) {
  return kv.delMany(key, customStore);
}

export function keys<K extends IDBValidKey>() {
  return kv.keys<K>(customStore);
}

export async function tryPersistStorage(): Promise<boolean> {
  const persisted = await navigator.storage.persisted();
  if (persisted) {
    return true;
  }
  return navigator.storage.persist();
}

export async function isStoragePersisted(): Promise<boolean> {
  return navigator.storage.persisted();
}
