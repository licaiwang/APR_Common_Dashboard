/** Pull APR-facing numbers out of a normalized `metrics` object (already `item.*.data`). */

export type SlackKind = "pass" | "warn" | "fail" | "unknown";

export type CornerRow = {
  view: string;
  wns: number | null;
  tns: number | null;
  nvp: number | null;
  hold_wns: number | null;
  hold_tns: number | null;
  hold_nvp: number | null;
};

export type PathGroupRow = {
  name: string;
  wns: number | null;
  tns: number | null;
  nvp: number | null;
};

export type TimingSnapshot = {
  wns: number | null;
  tns: number | null;
  nvp: number | null;
  hold_wns: number | null;
  hold_tns: number | null;
  hold_nvp: number | null;
  views: CornerRow[];
  groups: PathGroupRow[];
};

export type SlackHist = { unit: string; bins: string[]; counts: number[] };
export type UrateSnap = { design: number | null; target: number | null; corners: Record<string, number> };
export type VtMix = { name: string; share: number }[];
export type CongestionSnap = { overflow_h: number | null; overflow_v: number | null; hotspot: number | null };
export type ClockSnap = {
  period: number | null;
  latency: number | null;
  skew: number | null;
  uncertainty: number | null;
};

export function asNum(value: unknown): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "object" && !Array.isArray(value) && "value" in value) {
    return asNum((value as { value: unknown }).value);
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Setup WNS: ≥0 pass, mild negative warn, worse than −50ps fail. */
export function slackKind(wns: number | null): SlackKind {
  if (wns == null) return "unknown";
  if (wns < -0.05) return "fail";
  if (wns < 0) return "warn";
  return "pass";
}

export function extractItemMetrics(item: unknown): Record<string, unknown> {
  const metrics: Record<string, unknown> = {};
  if (!item || typeof item !== "object") return metrics;
  Object.entries(item as Record<string, unknown>).forEach(([section, body]) => {
    if (section === "stage_qa") return;
    if (!body || typeof body !== "object") return;
    const data = (body as { data?: unknown }).data;
    if (data && typeof data === "object") metrics[section] = data;
  });
  return metrics;
}

function recordOf(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function parseTiming(metrics: Record<string, unknown> | undefined | null): TimingSnapshot | null {
  const t = recordOf(metrics?.timing);
  if (!t) return null;
  const views: CornerRow[] = [];
  const byView = recordOf(t.by_view);
  if (byView) {
    Object.entries(byView).forEach(([view, raw]) => {
      const row = recordOf(raw) || {};
      views.push({
        view,
        wns: asNum(row.wns),
        tns: asNum(row.tns),
        nvp: asNum(row.nvp),
        hold_wns: asNum(row.hold_wns),
        hold_tns: asNum(row.hold_tns),
        hold_nvp: asNum(row.hold_nvp),
      });
    });
  }
  const groups: PathGroupRow[] = [];
  const byGroup = recordOf(t.by_group);
  if (byGroup) {
    Object.entries(byGroup).forEach(([name, raw]) => {
      const row = recordOf(raw) || {};
      groups.push({ name, wns: asNum(row.wns), tns: asNum(row.tns), nvp: asNum(row.nvp) });
    });
  }
  return {
    wns: asNum(t.wns),
    tns: asNum(t.tns),
    nvp: asNum(t.nvp),
    hold_wns: asNum(t.hold_wns),
    hold_tns: asNum(t.hold_tns),
    hold_nvp: asNum(t.hold_nvp),
    views,
    groups,
  };
}

export function parseSlackHist(metrics: Record<string, unknown> | undefined | null): SlackHist | null {
  const h = recordOf(metrics?.slack_hist);
  if (!h || !Array.isArray(h.bins) || !Array.isArray(h.counts)) return null;
  return {
    unit: String(h.unit || "ns"),
    bins: h.bins.map((b) => String(b)),
    counts: h.counts.map((c) => asNum(c) ?? 0),
  };
}

export function parseUrate(metrics: Record<string, unknown> | undefined | null): UrateSnap | null {
  const u = recordOf(metrics?.urate);
  if (!u) return null;
  const corners: Record<string, number> = {};
  Object.entries(u).forEach(([key, value]) => {
    if (key === "DESIGN" || key === "target") return;
    const n = asNum(value);
    if (n != null) corners[key] = n;
  });
  return { design: asNum(u.DESIGN), target: asNum(u.target), corners };
}

export function parseVt(metrics: Record<string, unknown> | undefined | null): VtMix {
  const v = recordOf(metrics?.vt_summary);
  if (!v) return [];
  return Object.entries(v)
    .map(([name, value]) => ({ name, share: asNum(value) ?? 0 }))
    .filter((row) => row.share > 0);
}

export function parseCongestion(metrics: Record<string, unknown> | undefined | null): CongestionSnap | null {
  const c = recordOf(metrics?.congestion);
  if (!c) return null;
  return {
    overflow_h: asNum(c.overflow_h),
    overflow_v: asNum(c.overflow_v),
    hotspot: asNum(c.hotspot),
  };
}

export function parseClock(metrics: Record<string, unknown> | undefined | null): ClockSnap | null {
  const c = recordOf(metrics?.clock);
  if (!c) return null;
  return {
    period: asNum(c.period),
    latency: asNum(c.latency),
    skew: asNum(c.skew),
    uncertainty: asNum(c.uncertainty),
  };
}
