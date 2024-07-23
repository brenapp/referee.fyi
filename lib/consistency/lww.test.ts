import { initLWW, mergeLWW, WithLWWConsistency } from "./index.js";
import { test, expect } from "vitest";

type BaseObject = {
  a: string;
  constant: string;
};
type Obj = WithLWWConsistency<BaseObject, "constant">;
const ignore = ["constant"] as const;

test("greater-count local value persists", () => {
  const local = initLWW<Obj>({
    peer: "A",
    value: { a: "Local Value", constant: "Constant" },
    ignore,
  });
  local.consistency.a.count = 1;

  const remote = initLWW<Obj>({
    peer: "A",
    value: { a: "Remote Value", constant: "Constant" },
    ignore,
  });

  const result = mergeLWW({ local, remote, ignore });
  expect(result).toEqual({ resolved: local, changed: [] });

  const opposite = mergeLWW({ local: remote, remote: local, ignore });
  expect(opposite.resolved).toEqual(result.resolved);
});

test("greater-count remote value persists", () => {
  const local = initLWW<Obj>({
    peer: "A",
    value: { a: "Local Value", constant: "Constant" },
    ignore,
  });

  const remote = initLWW<Obj>({
    peer: "A",
    value: { a: "Remote Value", constant: "Constant" },
    ignore,
  });
  remote.consistency.a.count = 2;

  const result = mergeLWW({ local, remote, ignore });
  expect(result).toEqual({ resolved: remote, changed: ["a"] });

  const opposite = mergeLWW({ local: remote, remote: local, ignore });
  expect(opposite.resolved).toEqual(result.resolved);
});

test("tie goes to higher peer value", () => {
  const local = initLWW<Obj>({
    peer: "A",
    value: { a: "Local Value", constant: "Constant" },
    ignore,
  });

  const remote = initLWW<Obj>({
    peer: "Z",
    value: { a: "Remote Value", constant: "Constant" },
    ignore,
  });

  const result = mergeLWW({ local, remote, ignore });
  expect(result).toEqual({ resolved: remote, changed: ["a"] });

  const opposite = mergeLWW({ local: remote, remote: local, ignore });
  expect(opposite.resolved).toEqual(result.resolved);
});

type BaseComplexObject = {
  a: { b: number };
  c: string;
  constant: string;
};
type ComplexObject = WithLWWConsistency<BaseComplexObject, "constant">;

test("lww is resolved on a key-by-key basis", () => {
  const local = initLWW<ComplexObject>({
    peer: "A",
    value: { a: { b: 10 }, c: "local", constant: "Constant" },
    ignore,
  });
  local.consistency.a = {
    count: 1,
    peer: "local-A",
    history: [{ peer: "local-A", prev: { b: 1 } }],
  };

  const remote = initLWW<ComplexObject>({
    peer: "A",
    value: { a: { b: 1000 }, c: "remote", constant: "Constant" },
    ignore,
  });
  remote.consistency.c = {
    count: 1,
    peer: "remote-A",
    history: [{ peer: "remote-A", prev: "remote prev" }],
  };

  const result = mergeLWW({ local, remote, ignore });
  expect(result).toEqual({
    resolved: {
      a: { b: 10 },
      c: "remote",
      constant: "Constant",
      consistency: {
        a: {
          count: 1,
          peer: "local-A",
          history: [{ peer: "local-A", prev: { b: 1 } }],
        },
        c: {
          count: 1,
          peer: "remote-A",
          history: [{ peer: "remote-A", prev: "remote prev" }],
        },
      },
    },
    changed: ["c"],
  });

  const opposite = mergeLWW({ local: remote, remote: local, ignore });
  expect(opposite.resolved).toEqual(result.resolved);
});

test("handles null and undefined", () => {
  const local = initLWW<Obj>({
    peer: "A",
    value: { a: "Local Value", constant: "Constant" },
    ignore,
  });

  const remote = null;

  const result = mergeLWW({ local, remote, ignore });
  expect(result.resolved).toEqual(local);
  expect(result.changed).toEqual([]);

  const opposite = mergeLWW({ local: null, remote: local, ignore });
  expect(opposite.resolved).toEqual(local);
  expect(opposite.changed).toEqual(["a"]);

  const bothNull = mergeLWW({ local: null, remote: null, ignore: [] });
  expect(bothNull.resolved).toBeNull();
  expect(bothNull.changed).toEqual([]);
});

test("merge is idempotent", async () => {
  const local = initLWW<ComplexObject>({
    peer: "A",
    value: { a: { b: 10 }, c: "local", constant: "Constant" },
    ignore,
  });
  local.consistency.a = {
    count: 1,
    peer: "local-A",
    history: [{ peer: "local-A", prev: { b: 1 } }],
  };

  const remote = initLWW<ComplexObject>({
    peer: "A",
    value: { a: { b: 1000 }, c: "remote", constant: "Constant" },
    ignore,
  });
  remote.consistency.c = {
    count: 1,
    peer: "remote-A",
    history: [{ peer: "remote-A", prev: "remote prev" }],
  };

  const localSelf = mergeLWW({ local, remote: local, ignore });
  expect(localSelf.resolved).toBe(localSelf.resolved);
  const remoteSelf = mergeLWW({ local: remote, remote, ignore });
  expect(remoteSelf.resolved).toBe(remoteSelf.resolved);
});

test("merge is associative", async () => {
  const A = initLWW<ComplexObject>({
    peer: "A",
    value: { a: { b: 10 }, c: "local", constant: "Constant" },
    ignore,
  });
  A.consistency.a = {
    count: 1,
    peer: "local-A",
    history: [{ peer: "local-A", prev: { b: 1 } }],
  };

  const B = initLWW<ComplexObject>({
    peer: "B",
    value: { a: { b: 1000 }, c: "remote", constant: "Constant" },
    ignore,
  });
  B.consistency.c = {
    count: 1,
    peer: "remote-A",
    history: [{ peer: "remote-A", prev: "remote prev" }],
  };

  const C = initLWW<ComplexObject>({
    peer: "C",
    value: { a: { b: 50 }, c: "remote", constant: "Constant" },
    ignore,
  });
  C.consistency.a = {
    count: 10,
    peer: "remote-A",
    history: [{ peer: "remote-A", prev: { b: -1 } }],
  };
  C.consistency.c = {
    count: 10,
    peer: "remote-C",
    history: [{ peer: "remote-C", prev: "remote C prev" }],
  };

  const AB = mergeLWW({ local: A, remote: B, ignore });
  const BC = mergeLWW({ local: B, remote: C, ignore });
  const AC = mergeLWW({ local: A, remote: C, ignore });

  const ABxC = mergeLWW({ local: AB.resolved, remote: C, ignore });
  const AxBC = mergeLWW({ local: A, remote: BC.resolved, ignore });
  const ACxB = mergeLWW({ local: AC.resolved, remote: B, ignore });

  expect(ABxC.resolved).toEqual(ACxB.resolved);
  expect(ABxC.resolved).toEqual(AxBC.resolved);
});
