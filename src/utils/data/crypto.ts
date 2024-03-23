import { get, set } from "idb-keyval";

export async function exportPublicKey(publicKey: CryptoKey, includePrefix = true) {
    const buffer = await crypto.subtle.exportKey("raw", publicKey);

    const key = Array.from(new Uint8Array(buffer), x => x.toString(16).padStart(2, '0')).join("")

    if (includePrefix) {
        return `${publicKey.algorithm.name}:${key}`;
    } else {
        return key;
    }
};

export async function generateKeys(): Promise<CryptoKeyPair> {

    const { privateKey, publicKey } = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-384" }, true, ["sign", "verify"]);

    const publicKeyJWK = await crypto.subtle.exportKey("jwk", publicKey);
    const privateKeyJWK = await crypto.subtle.exportKey("jwk", privateKey);

    await set("public_key", publicKeyJWK);
    await set("private_key", privateKeyJWK);

    return { privateKey, publicKey };
};


export async function getKeyPair(): Promise<CryptoKeyPair> {

    const publicJWK = await get<JsonWebKey>("public_key");
    const privateJWK = await get<JsonWebKey>("private_key");

    if (!publicJWK || !privateJWK) {
        return generateKeys();
    }

    const publicKey = await crypto.subtle.importKey("jwk", publicJWK, { name: "ECDSA", namedCurve: "P-384" }, true, ["verify"]);
    const privateKey = await crypto.subtle.importKey("jwk", privateJWK, { name: "ECDSA", namedCurve: "P-384" }, true, ["sign"]);

    return { publicKey, privateKey };
};

export async function getSignRequestHeaders(url: string): Promise<Headers> {

    const keys = await getKeyPair();

    const headers = new Headers();
    const date = new Date();

    const message = [
        date.toISOString(),
        url,
    ].join("");

    const messageBuffer = new TextEncoder().encode(message);
    const signature = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, keys.privateKey, messageBuffer);

    const hexSignature = Array.from(new Uint8Array(signature), x => x.toString(16).padStart(2, '0')).join("");

    headers.set("X-Referee-Date", date.toISOString());
    headers.set("X-Referee-Public-Key", await exportPublicKey(keys.publicKey));
    headers.set("X-Referee-Signature", hexSignature);

    return headers;
};