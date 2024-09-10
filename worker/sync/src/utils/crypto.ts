export const KEY_PREFIX = "ECDSA:";
export const KEY_ALGORITHM = { name: "ECDSA", namedCurve: "P-384" };

export function ingestHex(hex: string): Uint8Array | null {
  const keyBuffer = new Uint8Array(hex.length / 2);

  for (let i = 0; i < hex.length; i += 2) {
    const value = Number.parseInt(hex[i] + hex[i + 1], 16);

    if (!Number.isFinite(value)) {
      return null;
    }

    keyBuffer[i / 2] = value;
  }

  return keyBuffer;
}

export async function importKey(hexKey: string): Promise<CryptoKey | null> {
  if (!hexKey.startsWith(KEY_PREFIX)) {
    return null;
  }

  const keyBuffer = ingestHex(hexKey.slice(KEY_PREFIX.length));

  if (!keyBuffer) {
    return null;
  }

  let key: CryptoKey | null = null;
  try {
    key = await crypto.subtle.importKey("raw", keyBuffer, KEY_ALGORITHM, true, [
      "verify",
    ]);
  } catch (e) {
    return null;
  }

  return key;
}

export async function verifyKeySignature(
  key: CryptoKey,
  signature: string,
  message: string
): Promise<boolean> {
  const encoder = new TextEncoder();

  const messageBuffer = encoder.encode(message);
  const signatureBuffer = ingestHex(signature);

  if (!signatureBuffer) {
    return false;
  }

  const valid = await crypto.subtle.verify(
    { ...KEY_ALGORITHM, hash: "SHA-256" },
    key,
    signatureBuffer,
    messageBuffer
  );

  return valid;
}
