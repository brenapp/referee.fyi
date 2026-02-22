import { get, set } from "~utils/data/keyval";

export const KEY = "identity_key";

export async function exportPublicKey(includePrefix = true) {
	const { publicKey } = await getKeyPair();
	const buffer = await crypto.subtle.exportKey("raw", publicKey);

	const key = Array.from(new Uint8Array(buffer), (x) =>
		x.toString(16).padStart(2, "0"),
	).join("");

	if (includePrefix) {
		return `${publicKey.algorithm.name}:${key}`;
	} else {
		return key;
	}
}

export async function generateKeys(): Promise<CryptoKeyPair> {
	const pair = await crypto.subtle.generateKey(
		{ name: "ECDSA", namedCurve: "P-384" },
		true,
		["sign", "verify"],
	);

	await set(KEY, pair);
	return pair;
}

export async function getKeyPair(): Promise<CryptoKeyPair> {
	const pair = await get<CryptoKeyPair>(KEY);

	if (!pair) {
		return generateKeys();
	}

	return pair;
}

export async function signMessage(message: string) {
	const pair = await getKeyPair();
	const messageBuffer = new TextEncoder().encode(message);
	const signature = await crypto.subtle.sign(
		{ name: "ECDSA", hash: "SHA-256" },
		pair.privateKey,
		messageBuffer,
	);

	const hexSignature = Array.from(new Uint8Array(signature), (x) =>
		x.toString(16).padStart(2, "0"),
	).join("");

	return hexSignature;
}

export async function getSignRequestHeaders(
	request: Request,
): Promise<Headers> {
	const headers = new Headers();
	const date = new Date();

	const canonicalURL = new URL(request.url);
	canonicalURL.searchParams.delete("signature");
	canonicalURL.searchParams.delete("publickey");
	canonicalURL.searchParams.delete("signature_date");
	canonicalURL.searchParams.sort();

	const body = await request.clone().text();

	const message = [
		date.toISOString(),
		request.method,
		canonicalURL.host,
		canonicalURL.pathname,
		canonicalURL.search,
		body,
	].join("\n");

	const hexSignature = await signMessage(message);

	headers.set("X-Referee-Date", date.toISOString());
	headers.set("X-Referee-Public-Key", await exportPublicKey());
	headers.set("X-Referee-Signature", hexSignature);

	return headers;
}

export async function signWebSocketConnectionURL(url: URL): Promise<URL> {
	const request = new Request(url);
	const headers = await getSignRequestHeaders(request);

	const output = new URL(url);
	output.searchParams.set("signature_date", headers.get("X-Referee-Date")!);
	output.searchParams.set("publickey", headers.get("X-Referee-Public-Key")!);
	output.searchParams.set("signature", headers.get("X-Referee-Signature")!);

	return output;
}
