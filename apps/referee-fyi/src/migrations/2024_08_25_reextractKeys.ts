import { queueMigration } from "./utils";
import { generateKeys, KEY } from "~utils/data/crypto";
import { get, set } from "~utils/data/keyval";

export const PUBLIC_KEY = "public_key";
export const PRIVATE_KEY = "private_key";

async function hasMigrated() {
  return get<CryptoKeyPair>(KEY).then((pair) => !!pair);
}

queueMigration({
  name: `2024_07_28_keys`,
  run_order: 1,
  dependencies: [],
  apply: async () => {
    if (await hasMigrated()) {
      return { success: true };
    }

    const publicJWK = await get<JsonWebKey>(PUBLIC_KEY);
    const privateJWK = await get<JsonWebKey>(PRIVATE_KEY);

    console.log(publicJWK, privateJWK);

    if (!publicJWK || !privateJWK) {
      await generateKeys();
      return { success: true };
    }

    const publicKey = await crypto.subtle.importKey(
      "jwk",
      publicJWK,
      { name: "ECDSA", namedCurve: "P-384" },
      true,
      ["verify"]
    );
    const privateKey = await crypto.subtle.importKey(
      "jwk",
      privateJWK,
      { name: "ECDSA", namedCurve: "P-384" },
      true,
      ["sign"]
    );

    const pair = { publicKey, privateKey };
    await set(KEY, pair);

    return { success: true };
  },
});
