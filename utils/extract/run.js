import fs from "fs/promises";

console.log("Reading system key from `key.json`...");
const jwk = JSON.parse(await fs.readFile("key.json", "utf-8"));
const key = crypto.subtle.importKey(
  "jwk",
  jwk,
  { name: "ECDSA", namedCurve: "P-384" },
  true,
  ["sign"]
);

if (process.argv.length < 3) {
  console.error("Usage: node utils/extract/run.js <SKU> <>");
  process.exit(1);
}
