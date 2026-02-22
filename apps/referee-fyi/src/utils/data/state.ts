export function getBuildMode() {
	return import.meta.env.VITE_REFEREE_FYI_BUILD_MODE;
}

export const WORLDS_EVENTS: string[] = [
	"RE-V5RC-24-8909",
	"RE-V5RC-24-8910",
	"RE-VURC-24-8911",
	"RE-V5RC-24-8912",
	"RE-VIQRC-24-8913",
	"RE-VIQRC-24-8914",
];

export function isWorldsBuild() {
	return getBuildMode() === "WC";
}

export function isStandardBuild() {
	return getBuildMode() === "STANDARD";
}
