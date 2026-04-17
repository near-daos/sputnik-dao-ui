const KEY = "sputnik-dao-ui:recent";
const MAX = 8;

export function getRecentDaos(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.filter((x): x is string => typeof x === "string");
  } catch {
    return [];
  }
}

export function addRecentDao(daoId: string) {
  if (typeof window === "undefined") return;
  const trimmed = daoId.trim();
  if (!trimmed) return;
  const prev = getRecentDaos().filter((x) => x !== trimmed);
  const next = [trimmed, ...prev].slice(0, MAX);
  window.localStorage.setItem(KEY, JSON.stringify(next));
  window.localStorage.setItem("sputnik-dao-ui:last-dao", trimmed);
}

export function removeRecentDao(daoId: string) {
  if (typeof window === "undefined") return;
  const next = getRecentDaos().filter((x) => x !== daoId);
  window.localStorage.setItem(KEY, JSON.stringify(next));
}
