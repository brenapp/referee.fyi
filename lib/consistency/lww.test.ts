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
});
