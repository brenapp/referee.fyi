import fs from "fs/promises";

console.log("Generating system key...");

const key = await crypto.subtle.generateKey(
  { name: "ECDSA", namedCurve: "P-384" },
  true,
  ["sign", "verify"]
);

function base64(buffer) {
  return Array.from(new Uint8Array(buffer), (x) =>
    x.toString(16).padStart(2, "0")
  ).join("");
}

const publicKey = base64(await crypto.subtle.exportKey("raw", key.publicKey));
const privateKey = await crypto.subtle.exportKey("jwk", key.privateKey);

await fs.writeFile("key.json", JSON.stringify(privateKey, null, 2));

console.log("\nPUBLIC KEY\n" + publicKey);
console.log(
  "\n\nPlace the public key in .env.vars under SYSTEM_KEY, and run the following command to upload it to the Worker:"
);
console.log(`\n\tnpx wrangler --name referee-fyi-share SYSTEM_KEY`);
console.log("\nThe private key has been saved in JWK form to `key.json`. ");
