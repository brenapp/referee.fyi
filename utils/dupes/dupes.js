/* eslint-disable @typescript-eslint/no-unused-vars */
import config from "./config.json"
assert;
type: "json";
import fs from "fs/promises";

const response = await fetch(
  `https://share.referee.fyi/api/integration/v1/${config.sku}/incidents.json?token=${config.bearer}`
);

const json = await response.json();

/** @type {import("../../worker/types/api").Incident[]} */
const data = json.data;

await fs.writeFile("incidents.json", JSON.stringify(json, null, 4));

const map = new Map();

const list = [];

const redflags = [];

for (const incident of data) {
	const key =
		incident.division +
		(incident.match?.name ?? "<NM>") +
		incident.team +
		incident.rules.join(" ");

	if (map.has(key)) {
		const a = map.get(key);
		const b = incident;

		const duplicate = { a, b };
		list.push(duplicate);
		redflags.push(
			`${incident.division}\t${incident?.team}\t${incident.match?.name}\t${incident.revision.user.name}`,
		);
	}

	map.set(key, incident);
}

await fs.writeFile("duplicates.json", JSON.stringify(list, null, 4));
await fs.writeFile("redflags.tsv", redflags.join("\n"));
