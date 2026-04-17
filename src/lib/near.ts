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

const TGAS_DECIMALS = 12;

export function parseTGasToGasUnits(tgas: string): string {
  const trimmed = tgas.trim();
  if (!trimmed) return "0";
  const [intPart, fracPart = ""] = trimmed.split(".");
  const paddedFrac = fracPart
    .padEnd(TGAS_DECIMALS, "0")
    .slice(0, TGAS_DECIMALS);
  const combined = (intPart + paddedFrac).replace(/^0+/, "");
  return combined || "0";
}

export function formatGasUnitsAsTGas(
  gasUnits: string,
  maxFracDigits = 3,
): string {
  if (!gasUnits) return "0";
  const padded = gasUnits.padStart(TGAS_DECIMALS + 1, "0");
  const intPart =
    padded.slice(0, padded.length - TGAS_DECIMALS).replace(/^0+/, "") || "0";
  const fracPart = padded
    .slice(padded.length - TGAS_DECIMALS)
    .replace(/0+$/, "");
  const fracTrimmed = fracPart.slice(0, maxFracDigits);
  return fracTrimmed ? `${intPart}.${fracTrimmed}` : intPart;
}

// Browser-safe base64 of arbitrary Unicode text (btoa only accepts Latin-1).
export function base64EncodeUtf8(text: string): string {
  if (typeof window === "undefined") {
    return Buffer.from(text, "utf8").toString("base64");
  }
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

/**
 * Decode a base64 string to UTF-8 text. Strict: returns null if the input
 * isn't valid base64 or if the decoded bytes aren't valid UTF-8 (e.g. a
 * Borsh-serialized binary payload). Callers that want to show FunctionCall
 * args rely on the null to classify the payload as "binary — kept as
 * base64"; the wizard's round-trip (kindToWizard) already handles null by
 * falling back to the raw base64 string.
 */
export function base64DecodeUtf8(b64: string): string | null {
  try {
    if (typeof window === "undefined") {
      const buf = Buffer.from(b64, "base64");
      return new TextDecoder("utf-8", { fatal: true }).decode(buf);
    }
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}
