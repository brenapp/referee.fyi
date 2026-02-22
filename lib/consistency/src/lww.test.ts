import { expect, test } from "vitest";
import {
	initLWW,
	mergeLWW,
	updateLWW,
	type WithLWWConsistency,
} from "./index.js";

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
	local.consistency.a.count = 10;

	const remote = initLWW<Obj>({
		peer: "A",
		value: { a: "Remote Value", constant: "Constant" },
		ignore,
	});

	const result = mergeLWW({ local, remote, ignore });
	expect(result).toEqual({ resolved: local, changed: [], rejected: ["a"] });

	const opposite = mergeLWW({ local: remote, remote: local, ignore });
	expect(opposite).toEqual({
		resolved: result.resolved,
		changed: ["a"],
		rejected: [],
	});
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
	expect(result).toEqual({ resolved: remote, changed: ["a"], rejected: [] });

	const opposite = mergeLWW({ local: remote, remote: local, ignore });
	expect(opposite).toEqual({
		resolved: remote,
		changed: [],
		rejected: ["a"],
	});
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
	expect(result).toEqual({ resolved: remote, changed: ["a"], rejected: [] });

	const opposite = mergeLWW({ local: remote, remote: local, ignore });
	expect(opposite).toEqual({ resolved: remote, changed: [], rejected: [] });
});

type BaseComplexObject = {
	a: { b: number };
	c: string;
	constant: string;
};
type ComplexObject = WithLWWConsistency<BaseComplexObject, "constant">;

test("lww is resolved on a key-by-key basis", () => {
	let local = initLWW<ComplexObject>({
		peer: "A",
		value: { a: { b: 10 }, c: "local", constant: "Constant" },
		ignore,
	});
	local = updateLWW(local, { key: "a", value: { b: 1 }, peer: "peer-A" });

	let remote = initLWW<ComplexObject>({
		peer: "A",
		value: { a: { b: 1000 }, c: "remote", constant: "Constant" },
		ignore,
	});
	remote = updateLWW(remote, {
		key: "c",
		value: "remote prev",
		peer: "remote-A",
	});

	const result = mergeLWW({ local, remote, ignore });
	expect(result).toEqual({
		resolved: {
			a: { b: 1 },
			c: "remote prev",
			constant: "Constant",
			consistency: {
				a: local.consistency.a,
				c: remote.consistency.c,
			},
		},
		changed: ["c"],
		rejected: ["a"],
	});

	const opposite = mergeLWW({ local: remote, remote: local, ignore });
	expect(opposite).toEqual({
		resolved: result.resolved,
		changed: ["a"],
		rejected: ["c"],
	});
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
	let local = initLWW<ComplexObject>({
		peer: "A",
		value: { a: { b: 10 }, c: "local", constant: "Constant" },
		ignore,
	});
	local = updateLWW(local, { key: "a", value: { b: 1 }, peer: "peer-A" });

	let remote = initLWW<ComplexObject>({
		peer: "A",
		value: { a: { b: 1000 }, c: "remote", constant: "Constant" },
		ignore,
	});
	remote = updateLWW(remote, {
		key: "c",
		value: "remote prev",
		peer: "remote-A",
	});

	const localSelf = mergeLWW({ local, remote: local, ignore });
	expect(localSelf.resolved).toBe(localSelf.resolved);
	const remoteSelf = mergeLWW({ local: remote, remote, ignore });
	expect(remoteSelf.resolved).toBe(remoteSelf.resolved);
});

test("merge is associative", async () => {
	let A = initLWW<ComplexObject>({
		peer: "A",
		value: { a: { b: 10 }, c: "local", constant: "Constant" },
		ignore,
	});
	A = updateLWW(A, { key: "a", value: { b: 1 }, peer: "peer-A" });

	let B = initLWW<ComplexObject>({
		peer: "B",
		value: { a: { b: 1000 }, c: "remote", constant: "Constant" },
		ignore,
	});
	B = updateLWW(B, { key: "c", value: "remote prev", peer: "remote-A" });

	let C = initLWW<ComplexObject>({
		peer: "C",
		value: { a: { b: 50 }, c: "remote", constant: "Constant" },
		ignore,
	});
	C = updateLWW(C, { key: "c", value: "remote C prev", peer: "remote-C" });
	C = updateLWW(C, { key: "a", value: { b: -1 }, peer: "remote-C" });

	const AB = mergeLWW({ local: A, remote: B, ignore });
	const BC = mergeLWW({ local: B, remote: C, ignore });
	const AC = mergeLWW({ local: A, remote: C, ignore });

	const ABxC = mergeLWW({ local: AB.resolved, remote: C, ignore });
	const AxBC = mergeLWW({ local: A, remote: BC.resolved, ignore });
	const ACxB = mergeLWW({ local: AC.resolved, remote: B, ignore });

	expect(ABxC.resolved).toEqual(ACxB.resolved);
	expect(ABxC.resolved).toEqual(AxBC.resolved);
});
