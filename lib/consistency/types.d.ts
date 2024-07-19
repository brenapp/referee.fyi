export type KeyArray<T> = readonly (keyof T)[] | readonly (keyof T)[];

export type KeysWithout<T, A extends KeyArray<T>> = Exclude<keyof T, A[number]>;
