import type { DashboardSnapshot } from "../types";

export function mountDashboard(opts: {
  onView: (snapshot: DashboardSnapshot) => void;
}): () => void;

export function extractMetrics(payload: Record<string, unknown>): Record<string, unknown>;

export function unwrapMetric(value: unknown): unknown;

export function aprLatestFields(upload: Record<string, unknown> | null | undefined): Record<string, unknown> | null;

export function signoffLatestFields(upload: Record<string, unknown> | null | undefined): Record<string, unknown> | null;
