import { WebSocketSender } from "./api";

type ChangeMap<T, U> = {
  [K in keyof Omit<T, U>]-?: {
    property: K;
    old: T[K];
    new: T[K];
  };
};

type Change<T, U> = ChangeMap<T, U>[keyof ChangeMap<T, U>];

export type ChangeLog<T, U> = {
  user: WebSocketSender;
  date: Date;
  changes: Change<T, U>[];
};

export type Revision<T, U> = {
  user: WebSocketSender;
  count: number;
  history: ChangeLog<T, U>[];
};

export type WithRevision<T, U> = T & { revision?: Revision<T, U> };
