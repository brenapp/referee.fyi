export type ComponentParts<T> = {
  parts?:
    | {
        [K in keyof T]?: Partial<T[K]>;
      }
    | null;
};
