import { PATHISH_KEY_HINTS, QA_BADGE_CLASS } from "../config";

/**
 * Display helpers shared by dashboard logic and React views.
 */

export function fmt(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "number") {
    return Number.isInteger(value) ? String(value) : value.toFixed(3);
  }
  return String(value);
}

export function qaClass(status: unknown): string {
  const s = String(status || "").toUpperCase();
  return QA_BADGE_CLASS[s] || QA_BADGE_CLASS.UNKNOWN;
}

export function isPathishKey(key: unknown): boolean {
  const lower = String(key).toLowerCase();
  return PATHISH_KEY_HINTS.some((hint) => lower.includes(hint));
}

export function isPathishValue(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const text = value.trim();
  if (!text) return false;
  if (text.startsWith("/") || text.includes("\\")) return true;
  return /\.(rpt|gif|html?|tk|list|png|jpe?g|csv|json)$/i.test(text);
}

export function digPath(obj: unknown, path: Array<string | number>): unknown {
  let cur: unknown = obj;
  for (const key of path) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string | number, unknown>)[key];
  }
  return cur;
}
