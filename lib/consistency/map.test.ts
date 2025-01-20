import { test, expect } from "vitest";
import { ConsistentMap, mergeMap } from "./map.js";
import { initLWW, mergeLWW, updateLWW, WithLWWConsistency } from "./lww.js";

type BaseIncident = {
  id: string;
  event: string;
  team: string;
  note: string;
  rule: string;
};
const ignore = ["id", "event", "team"] as const;

type Incident = WithLWWConsistency<BaseIncident, "id" | "event" | "team">;

test("new local entries uploaded", () => {
  const local: ConsistentMap<Incident> = {
    deleted: [],
    values: {
      incident1: initLWW<Incident>({
        ignore,
        peer: "LOCAL",
        value: {
          id: "incident1",
          event: "RE-VRC-23-3690",
          team: "3796B",
          rule: "<SG11>",
          note: "Expansion",
        },
      }),
    },
  };

  const remote: ConsistentMap<Incident> = {
    deleted: ["incident12"],
    values: {},
  };

  const result = mergeMap({
    local,
    remote,
    merge: (local, remote) => mergeLWW({ local, remote, ignore }),
  });
  expect(result.resolved.deleted).toEqual(["incident12"]);
  expect(result.resolved.values).toEqual(local.values);

  expect(result.local.added).toEqual([]);
  expect(result.local.changed).toEqual([]);
  expect(result.local.removed).toEqual(["incident12"]);

  expect(result.remote.added).toEqual(["incident1"]);
  expect(result.remote.changed).toEqual([]);
  expect(result.remote.removed).toEqual([]);
});

test("new remote entries saved", () => {
  const local: ConsistentMap<Incident> = {
    deleted: ["incident12"],
    values: {},
  };

  const remote: ConsistentMap<Incident> = {
    deleted: [],
    values: {
      incident1: initLWW({
        ignore,
        peer: "LOCAL",
        value: {
          id: "incident1",
          event: "RE-VRC-23-3690",
          team: "3796B",
          rule: "<SG11>",
          note: "Expansion",
        },
      }),
    },
  };

  const result = mergeMap({
    local,
    remote,
    merge: (local, remote) => mergeLWW({ local, remote, ignore }),
  });
  expect(result.resolved.deleted).toEqual(["incident12"]);
  expect(result.resolved.values).toEqual(remote.values);

  expect(result.local.added).toEqual(["incident1"]);
  expect(result.local.changed).toEqual([]);
  expect(result.local.removed).toEqual([]);

  expect(result.remote.added).toEqual([]);
  expect(result.remote.changed).toEqual([]);
  expect(result.remote.removed).toEqual(["incident12"]);
});

test("local update handled", () => {
  const local: ConsistentMap<Incident> = {
    deleted: ["incident12"],
    values: {
      incident1: initLWW({
        ignore,
        peer: "REMOTE",
        value: {
          id: "incident1",
          event: "RE-VRC-23-3690",
          team: "3796B",
          rule: "<SG11>",
          note: "Expansion",
        },
      }),
    },
  };
  local.values["incident1"] = updateLWW(local.values["incident1"], {
    key: "note",
    value: "Expansion BMM EDIT",
    peer: "LOCAL",
  });

  const remote: ConsistentMap<Incident> = {
    deleted: [],
    values: {
      incident1: initLWW({
        ignore,
        peer: "REMOTE",
        value: {
          id: "incident1",
          event: "RE-VRC-23-3690",
          team: "3796B",
          rule: "<SG11>",
          note: "Expansion",
        },
      }),
    },
  };

  const result = mergeMap({
    local,
    remote,
    merge: (local, remote) => mergeLWW({ local, remote, ignore }),
  });
  console.log(result);
  expect(result.resolved.deleted).toEqual(["incident12"]);
  expect(result.resolved.values).toEqual(local.values);

  expect(result.local.added).toEqual([]);
  expect(result.local.changed).toEqual([]);
  expect(result.local.removed).toEqual([]);

  expect(result.remote.added).toEqual([]);
  expect(result.remote.changed).toEqual(["incident1"]);
  expect(result.remote.removed).toEqual(["incident12"]);
});

test("remote update handled", () => {
  const local: ConsistentMap<Incident> = {
    deleted: ["incident12"],
    values: {
      incident1: initLWW({
        ignore,
        peer: "REMOTE",
        value: {
          id: "incident1",
          event: "RE-VRC-23-3690",
          team: "3796B",
          rule: "<SG11>",
          note: "Expansion",
        },
      }),
    },
  };
  local.values["incident1"] = updateLWW(local.values["incident1"], {
    key: "note",
    value: "Expansion BMM EDIT",
    peer: "LOCAL",
  });

  const remote: ConsistentMap<Incident> = {
    deleted: [],
    values: {
      incident1: initLWW({
        ignore,
        peer: "REMOTE",
        value: {
          id: "incident1",
          event: "RE-VRC-23-3690",
          team: "3796B",
          rule: "<SG11>",
          note: "Expansion",
        },
      }),
    },
  };
  remote.values["incident1"] = updateLWW(remote.values["incident1"], {
    key: "rule",
    value: "<SG8>",
    peer: "REMOTE",
  });

  const result = mergeMap({
    local,
    remote,
    merge: (local, remote) => mergeLWW({ local, remote, ignore }),
  });
  expect(result.resolved.deleted).toEqual(["incident12"]);
  expect(result.resolved.values["incident1"]).toEqual({
    id: "incident1",
    event: "RE-VRC-23-3690",
    team: "3796B",
    rule: "<SG8>",
    note: "Expansion BMM EDIT",
    consistency: {
      rule: remote.values["incident1"].consistency.rule,
      note: local.values["incident1"].consistency.note,
    },
  });

  expect(result.local.added).toEqual([]);
  expect(result.local.changed).toEqual(["incident1"]);
  expect(result.local.removed).toEqual([]);

  expect(result.remote.added).toEqual([]);
  expect(result.remote.changed).toEqual(["incident1"]);
  expect(result.remote.removed).toEqual(["incident12"]);
});

test("deleted values merged", () => {
  const local: ConsistentMap<Incident> = {
    deleted: ["incident1", "incident2", "incident3"],
    values: {},
  };

  const remote: ConsistentMap<Incident> = {
    deleted: ["incident3", "incident4", "incident5"],
    values: {},
  };

  const result = mergeMap({
    local,
    remote,
    merge: (local, remote) => mergeLWW({ local, remote, ignore }),
  });
  expect(result.resolved.deleted).toEqual([
    "incident1",
    "incident2",
    "incident3",
    "incident4",
    "incident5",
  ]);
  expect(result.resolved.values).toEqual({});

  expect(result.local.added).toEqual([]);
  expect(result.local.changed).toEqual([]);
  expect(result.local.removed).toEqual(["incident4", "incident5"]);

  expect(result.remote.added).toEqual([]);
  expect(result.remote.changed).toEqual([]);
  expect(result.remote.removed).toEqual(["incident1", "incident2"]);
});
