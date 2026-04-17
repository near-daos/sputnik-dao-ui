const NEAR_DECIMALS = 24;

export function parseNearToYocto(near: string): string {
  const trimmed = near.trim();
  if (!trimmed) return "0";
  const [intPart, fracPart = ""] = trimmed.split(".");
  const paddedFrac = fracPart.padEnd(NEAR_DECIMALS, "0").slice(0, NEAR_DECIMALS);
  const combined = (intPart + paddedFrac).replace(/^0+/, "");
  return combined || "0";
}

export function formatNearAmount(yoctoNear: string, maxFracDigits = 4): string {
  if (!yoctoNear) return "0";
  const padded = yoctoNear.padStart(NEAR_DECIMALS + 1, "0");
  const intPart = padded.slice(0, padded.length - NEAR_DECIMALS).replace(/^0+/, "") || "0";
  const fracPart = padded.slice(padded.length - NEAR_DECIMALS).replace(/0+$/, "");
  const fracTrimmed = fracPart.slice(0, maxFracDigits);
  const intWithCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return fracTrimmed ? `${intWithCommas}.${fracTrimmed}` : intWithCommas;
}

export function isValidAccountId(accountId: string): boolean {
  if (accountId.length < 2 || accountId.length > 64) return false;
  return /^(([a-z\d]+[-_])*[a-z\d]+\.)*([a-z\d]+[-_])*[a-z\d]+$/.test(accountId);
}

export function shortenAccount(accountId: string, head = 8, tail = 6): string {
  if (accountId.length <= head + tail + 1) return accountId;
  return `${accountId.slice(0, head)}…${accountId.slice(-tail)}`;
}

export function formatTimestampNs(ns: string | number): string {
  const nsBig = typeof ns === "string" ? BigInt(ns) : BigInt(ns);
  const ms = Number(nsBig / BigInt(1_000_000));
  return new Date(ms).toLocaleString();
}
