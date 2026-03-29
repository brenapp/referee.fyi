import type { Routes } from "~types/worker/sync";
import { URL_BASE } from "./share";

export const WORLDS_EVENTS: string[] = [
	"RE-V5RC-26-4025",
	"RE-V5RC-26-4026",
	"RE-VURC-26-4027",
	"RE-VIQRC-26-4028",
	"RE-VIQRC-26-4029",
];

export type ProductFlags = {
	mode: "WC" | "STANDARD";
};

export type ProductFlag<K extends keyof ProductFlags = keyof ProductFlags> = {
	key: K;
	value: ProductFlags[K] | null;
};

export async function getProductFlags(): Promise<ProductFlag[]> {
	const response = await fetch(new URL("/api/meta/flags", URL_BASE));
	if (!response.ok) {
		return [];
	}

	const body = (await response.json()) as Routes["/api/meta/flags"]["get"];
	if (!body.success) {
		return [];
	}

	return body.data as ProductFlag[];
}

export function getProductFlag<K extends keyof ProductFlags>(
	flags: ProductFlag[],
	key: K,
): ProductFlags[K] | null {
	const flag = flags.find((f) => f.key === key);
	if (!flag) {
		return null;
	}

	return flag.value as ProductFlags[K];
}
