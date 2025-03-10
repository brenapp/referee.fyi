export function getBuildMode() {
  return import.meta.env.VITE_REFEREE_FYI_BUILD_MODE;
}

export function isWorldsBuild() {
  return getBuildMode() === "WC";
}

export function isStandardBuild() {
  return getBuildMode() === "STANDARD";
}
