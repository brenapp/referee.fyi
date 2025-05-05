import { UAParser } from "ua-parser-js";

export function getBuildMode() {
  return import.meta.env.VITE_REFEREE_FYI_BUILD_MODE;
}

export const WORLDS_EVENTS = [
  "RE-V5RC-24-8909",
  "RE-V5RC-24-8910",
  "RE-VURC-24-8911",
  "RE-VIQRC-24-8913",
  "RE-VIQRC-24-8914",
];

export function isWorldsBuild() {
  return getBuildMode() === "WC";
}

export function isStandardBuild() {
  return getBuildMode() === "STANDARD";
}

const userAgent = UAParser();

export function getUserAgent() {
  return userAgent;
}

export function isSafariMobile() {
  const isSafari =
    userAgent.browser.name === "Safari" ||
    userAgent.browser.name === "Mobile Safari";

  const mobile =
    userAgent.device.type === "mobile" || userAgent.device.type === "tablet";

  console.log(userAgent, isSafari, mobile);
  return isSafari && mobile;
}
