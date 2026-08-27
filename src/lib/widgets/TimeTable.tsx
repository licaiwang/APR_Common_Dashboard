import { fmt } from "../../legacy/format";
import type { StageNode } from "../../types";
import type { MetricWidgetProps } from "./types";

type CornerRow = {
  name: string;
  values: Record<string, unknown>;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function num(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function slackKind(value: unknown): "pass" | "fail" | "unknown" {
  const n = num(value);
  if (n == null) return "unknown";
  return n >= 0 ? "pass" : "fail";
}

function payloadOf(node: StageNode, section: string, kind: string): unknown {
  const body = node.metrics?.[section];
  if (!body || typeof body !== "object" || Array.isArray(body)) return undefined;
  return (body as Record<string, unknown>)[kind];
}

function parseTimeTable(payload: unknown): { corners: CornerRow[]; metrics: string[] } {
  const root = asRecord(payload);
  const cornersObj = asRecord(root?.corners) ?? root;
  if (!cornersObj) return { corners: [], metrics: [] };

  const corners = Object.keys(cornersObj)
    .sort()
    .map((name) => ({ name, values: asRecord(cornersObj[name]) ?? {} }));

  const preferred = ["wns", "tns"];
  const seen = new Set<string>();
  const metrics: string[] = [];
  preferred.forEach((key) => {
    if (corners.some((c) => key in c.values)) {
      seen.add(key);
      metrics.push(key);
    }
  });
  corners.forEach((corner) => {
    Object.keys(corner.values).forEach((key) => {
      if (seen.has(key)) return;
      seen.add(key);
      metrics.push(key);
    });
  });

  return { corners, metrics };
}

function mergeAxes(chain: StageNode[], section: string, kind: string) {
  const parsed = chain.map((node) => ({
    node,
    table: parseTimeTable(payloadOf(node, section, kind)),
  }));
  const cornerNames = new Set<string>();
  const metricNames = new Set<string>();
  parsed.forEach(({ table }) => {
    table.corners.forEach((corner) => cornerNames.add(corner.name));
    table.metrics.forEach((metric) => metricNames.add(metric));
  });

  const preferred = ["wns", "tns"];
  const metrics = [
    ...preferred.filter((key) => metricNames.has(key)),
    ...[...metricNames].filter((key) => !preferred.includes(key)).sort(),
  ];
  const corners = [...cornerNames].sort();
  return { parsed, corners, metrics };
}

export function TimeTableWidget({ section, kind, node, chain }: MetricWidgetProps) {
  const { parsed, corners, metrics } = mergeAxes(chain, section, kind);
  if (!corners.length || !metrics.length) return null;

  const grouped = metrics.length > 1;

  return (
    <section className="card time-table">
      <div className="section-head">
        <h3>{section}</h3>
        <p className="muted">
          {corners.length} corners · stacked by stage
        </p>
      </div>
      <div className="table-scroll">
        <table className="data time-table-grid">
          <thead>
            {grouped ? (
              <>
                <tr>
                  <th className="sticky-col" rowSpan={2}>
                    stage
                  </th>
                  {corners.map((corner) => (
                    <th className="mono" key={corner} colSpan={metrics.length}>
                      {corner}
                    </th>
                  ))}
                </tr>
                <tr>
                  {corners.flatMap((corner) =>
                    metrics.map((metric) => (
                      <th key={`${corner}.${metric}`}>{metric.toUpperCase()}</th>
                    )),
                  )}
                </tr>
              </>
            ) : (
              <tr>
                <th className="sticky-col">stage</th>
                {corners.map((corner) => (
                  <th className="mono" key={corner}>
                    {corner}
                  </th>
                ))}
              </tr>
            )}
          </thead>
          <tbody>
            {parsed.map(({ node: row, table }) => {
              const byName = new Map(table.corners.map((corner) => [corner.name, corner.values]));
              const current = row.id === node.id;
              return (
                <tr className={current ? "current-stage" : undefined} key={row.id}>
                  <th className="sticky-col mono">{row.stage || "—"}</th>
                  {corners.flatMap((corner) => {
                    const values = byName.get(corner) || {};
                    const keys = grouped ? metrics : [metrics[0]];
                    return keys.map((metric) => {
                      const value = values[metric];
                      return (
                        <td className={`mono slack-${slackKind(value)}`} key={`${row.id}:${corner}:${metric}`}>
                          {fmt(value)}
                        </td>
                      );
                    });
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
