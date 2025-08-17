import type { paths } from "../generated/worker/sync";

export type Method =
  | "get"
  | "post"
  | "put"
  | "delete"
  | "patch"
  | "options"
  | "head"
  | "trace";

type InferResponseType<T> = T extends {
  content: { "application/json": infer U };
}
  ? U
  : never;

type RouteResponse<T> = {
  [K in keyof T]: InferResponseType<T[K]>;
}[keyof T];

type MethodKeys<T> = {
  [K in keyof T]: T[K] extends { responses: unknown } ? K : never;
};

type RouteData<P extends keyof paths> = {
  [K in keyof MethodKeys<paths[P]>]: paths[P][K] extends {
    responses: infer R;
  }
    ? RouteResponse<R>
    : never;
};

export type Routes = {
  [P in keyof paths]: RouteData<P>;
};

export type RouteWithMethod<M extends Method> = {
  [P in keyof paths]: M extends keyof paths[P]
    ? paths[P][M] extends { responses: unknown }
      ? P
      : never
    : never;
}[keyof paths];

export type SuccessResponseData<
  M extends Method,
  T extends RouteWithMethod<M>,
> = (Routes[T][M] & { success: true })["data"];
