/* eslint-disable @typescript-eslint/no-unused-vars */
import config from "./config.json" assert { type: "json" };
import crypto from "crypto";
import fs from "fs/promises";

const values = await fs
  .readFile("./headreferees.tsv")
  .then((b) => b.toString("utf8"));

const [header, ...users] = values.split(/\r*\n/g).slice(1);
const skus = header.split("\t").slice(4);

const secrets = skus.map((sku) => config.invitations[sku]);

const invitations = [];

for (const user of users) {
  const [adminRaw, emailRaw, name, publicKey, ...events] = user.split("\t");
  if (!name) continue;

  console.log(name, emailRaw);

  for (let i = 0; i < skus.length; i++) {
    if (events[i] !== "TRUE") {
      continue;
    }

    invitations.push({
      key: `${publicKey}#${skus[i]}`,
      value: {
        id: crypto.randomUUID(),
        sku: skus[i],
        instance_secret: secrets[i],
        user: publicKey,
        from: config.from.key,
        admin: adminRaw === "TRUE",
        accepted: true,
      },
    });
  }
}

await fs.writeFile(
  "./invitations.json",
  JSON.stringify(
    invitations.map(({ key, value }) => ({
      key,
      value: JSON.stringify(value),
    })),
    null,
    4
  )
);

const shares = [];

for (let i = 0; i < skus.length; i++) {
  const sku = skus[i];
  const secret = secrets[i];

  const admins = invitations
    .filter((inv) => inv.value.admin && inv.value.sku === sku)
    .map((i) => i.value.user);
  const invs = invitations
    .filter((inv) => inv.value.sku === sku)
    .map((i) => i.value.user);

  console.log(sku, admins, invs);

  shares.push({
    key: `${sku}#${secret}`,
    value: {
      sku,
      admins,
      invitations: invs,
      secret,
    },
  });
}

await fs.writeFile(
  "./shares.json",
  JSON.stringify(
    shares.map(({ key, value }) => ({ key, value: JSON.stringify(value) })),
    null,
    4
  )
);
