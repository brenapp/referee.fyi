import { lww } from "./index.js";
import { test, expect } from "vitest";

type BaseObject = {
  a: string;
  constant: string;
};
const ignore = ["constant"] as const;

test("greater-count local value persists", () => {
  const local = lww.init<BaseObject, typeof ignore>({
    peer: "A",
    value: { a: "Local Value", constant: "Constant" },
    ignore,
  });
  local.consistency.a.count = 1;

  const remote = lww.init<BaseObject, typeof ignore>({
    peer: "A",
    value: { a: "Remote Value", constant: "Constant" },
    ignore,
  });

  const result = lww.merge({ local, remote, ignore });
  expect(result).toEqual({ resolved: local, changed: [] });

  const opposite = lww.merge({ local: remote, remote: local, ignore });
  expect(opposite.resolved).toEqual(result.resolved);
});

test("greater-count remote value persists", () => {
  const local = lww.init<BaseObject, typeof ignore>({
    peer: "A",
    value: { a: "Local Value", constant: "Constant" },
    ignore,
  });

  const remote = lww.init<BaseObject, typeof ignore>({
    peer: "A",
    value: { a: "Remote Value", constant: "Constant" },
    ignore,
  });
  remote.consistency.a.count = 2;

  const result = lww.merge({ local, remote, ignore });
  expect(result).toEqual({ resolved: remote, changed: ["a"] });

  const opposite = lww.merge({ local: remote, remote: local, ignore });
  expect(opposite.resolved).toEqual(result.resolved);
});

test("tie goes to higher peer value", () => {
  const local = lww.init<BaseObject, typeof ignore>({
    peer: "A",
    value: { a: "Local Value", constant: "Constant" },
    ignore,
  });

  const remote = lww.init<BaseObject, typeof ignore>({
    peer: "Z",
    value: { a: "Remote Value", constant: "Constant" },
    ignore,
  });

  const result = lww.merge({ local, remote, ignore });
  expect(result).toEqual({ resolved: remote, changed: ["a"] });

  const opposite = lww.merge({ local: remote, remote: local, ignore });
  expect(opposite.resolved).toEqual(result.resolved);
});

type ComplexObject = {
  a: { b: number };
  c: string;
  constant: string;
};

test("lww is resolved on a key-by-key basis", () => {
  const local = lww.init<ComplexObject, typeof ignore>({
    peer: "A",
    value: { a: { b: 10 }, c: "local", constant: "Constant" },
    ignore,
  });
  local.consistency.a = {
    count: 1,
    peer: "local-A",
    history: [{ peer: "local-A", prev: { b: 1 } }],
  };

  const remote = lww.init<ComplexObject, typeof ignore>({
    peer: "A",
    value: { a: { b: 1000 }, c: "remote", constant: "Constant" },
    ignore,
  });
  remote.consistency.c = {
    count: 1,
    peer: "remote-A",
    history: [{ peer: "remote-A", prev: "remote prev" }],
  };

  const result = lww.merge({ local, remote, ignore });
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

  const opposite = lww.merge({ local: remote, remote: local, ignore });
  expect(opposite.resolved).toEqual(result.resolved);
});
