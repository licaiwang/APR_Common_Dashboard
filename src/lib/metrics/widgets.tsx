import { Fragment } from "react";
import { fmt } from "../../legacy/format";
import { Badge } from "../helpers";
import type { ClockSnap, CongestionSnap, PathGroupRow, SlackHist, SlackKind, TimingSnapshot, UrateSnap, VtMix } from "./parse";
import { slackKind } from "./parse";

function ns(value: number | null | undefined): string {
  return value == null ? "—" : fmt(value);
}

function kindClass(kind: SlackKind): string {
  return `metric-kind kind-${kind}`;
}

export function KpiStrip({ timing }: { timing: TimingSnapshot }) {
  const cards: Array<{ label: string; value: string; hint: string; kind: SlackKind }> = [
    { label: "WNS", value: ns(timing.wns), hint: "setup ns", kind: slackKind(timing.wns) },
    { label: "TNS", value: ns(timing.tns), hint: "setup ns", kind: slackKind(timing.tns) },
    { label: "NVP", value: ns(timing.nvp), hint: "violating paths", kind: (timing.nvp ?? 0) > 0 ? "warn" : "pass" },
    { label: "Hold WNS", value: ns(timing.hold_wns), hint: "hold ns", kind: slackKind(timing.hold_wns) },
  ];
  return (
    <div className="kpi-strip">
      {cards.map((card) => (
        <article className={`kpi-card ${kindClass(card.kind)}`} key={card.label}>
          <p className="kpi-label">{card.label}</p>
          <p className="kpi-value mono">{card.value}</p>
          <p className="kpi-hint">{card.hint}</p>
        </article>
      ))}
    </div>
  );
}

export function CornerTable({ timing }: { timing: TimingSnapshot }) {
  if (!timing.views.length) return <p className="muted">No by_view corners in this run.</p>;
  return (
    <div className="table-scroll">
      <table className="data">
        <thead>
          <tr>
            <th>View</th>
            <th>Setup WNS</th>
            <th>Setup TNS</th>
            <th>NVP</th>
            <th>Hold WNS</th>
            <th>Hold NVP</th>
          </tr>
        </thead>
        <tbody>
          {timing.views.map((row) => (
            <tr key={row.view}>
              <td className="mono">{row.view}</td>
              <td className={kindClass(slackKind(row.wns))}>{ns(row.wns)}</td>
              <td className="mono">{ns(row.tns)}</td>
              <td className="mono">{ns(row.nvp)}</td>
              <td className={kindClass(slackKind(row.hold_wns))}>{ns(row.hold_wns)}</td>
              <td className="mono">{ns(row.hold_nvp)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TimingHeatmap({ timing }: { timing: TimingSnapshot }) {
  if (!timing.views.length) return <p className="muted">Need timing.by_view for a heatmap.</p>;
  const cols: Array<{ key: "wns" | "hold_wns"; label: string }> = [
    { key: "wns", label: "setup WNS" },
    { key: "hold_wns", label: "hold WNS" },
  ];
  return (
    <div className="heat-grid" style={{ gridTemplateColumns: `minmax(8rem, 1.6fr) repeat(${cols.length}, 1fr)` }}>
      <div className="heat-head" />
      {cols.map((col) => (
        <div className="heat-head" key={col.key}>
          {col.label}
        </div>
      ))}
      {timing.views.map((row) => (
        <Fragment key={row.view}>
          <div className="heat-label mono">{row.view}</div>
          {cols.map((col) => {
            const value = row[col.key];
            return (
              <div className={`heat-cell ${kindClass(slackKind(value))}`} key={col.key} title={ns(value)}>
                {ns(value)}
              </div>
            );
          })}
        </Fragment>
      ))}
    </div>
  );
}

export function SlackHistogram({ hist }: { hist: SlackHist }) {
  const max = Math.max(1, ...hist.counts);
  return (
    <div className="hist">
      {hist.bins.map((bin, i) => {
        const count = hist.counts[i] ?? 0;
        const failing = bin.startsWith("-") || bin.startsWith("<-");
        return (
          <div className="hist-col" key={bin}>
            <span className="hist-count mono">{count}</span>
            <div className="hist-track">
              <div
                className={`hist-bar${failing ? " hist-fail" : " hist-ok"}`}
                style={{ height: `${(count / max) * 100}%` }}
              />
            </div>
            <span className="hist-bin mono">{bin}</span>
          </div>
        );
      })}
    </div>
  );
}

export function UrateMeter({ urate }: { urate: UrateSnap }) {
  const design = urate.design ?? 0;
  const target = urate.target ?? 1;
  const pct = Math.min(100, Math.max(0, design * 100));
  const over = urate.design != null && urate.target != null && urate.design > urate.target;
  return (
    <div>
      <div className="meter-head">
        <strong className="mono">{design ? `${(design * 100).toFixed(1)}%` : "—"}</strong>
        <span className="muted">target {target ? `${(target * 100).toFixed(0)}%` : "—"}</span>
      </div>
      <div className="meter-track">
        <div className={`meter-fill${over ? " meter-over" : ""}`} style={{ width: `${pct}%` }} />
        {urate.target != null ? <span className="meter-mark" style={{ left: `${urate.target * 100}%` }} /> : null}
      </div>
    </div>
  );
}

const VT_COLORS: Record<string, string> = {
  ulvt: "#a12828",
  lvt: "#c46a1a",
  svt: "#0f5c4c",
  hvt: "#274690",
};

export function VtMixBar({ mix }: { mix: VtMix }) {
  if (!mix.length) return <p className="muted">No vt_summary.</p>;
  const total = mix.reduce((s, row) => s + row.share, 0) || 1;
  return (
    <div>
      <div className="stack-bar">
        {mix.map((row) => (
          <span
            key={row.name}
            className="stack-seg"
            style={{ width: `${(row.share / total) * 100}%`, background: VT_COLORS[row.name] || "#5c6b63" }}
            title={`${row.name} ${(row.share * 100).toFixed(0)}%`}
          />
        ))}
      </div>
      <ul className="stack-legend">
        {mix.map((row) => (
          <li key={row.name}>
            <i style={{ background: VT_COLORS[row.name] || "#5c6b63" }} />
            {row.name} {(row.share * 100).toFixed(0)}%
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PathGroupBars({ groups }: { groups: PathGroupRow[] }) {
  if (!groups.length) return <p className="muted">No by_group path groups.</p>;
  const worst = Math.min(-0.01, ...groups.map((g) => g.wns ?? 0));
  return (
    <div className="group-bars">
      {groups.map((g) => {
        const wns = g.wns ?? 0;
        const width = wns >= 0 ? 4 : Math.max(8, (Math.abs(wns) / Math.abs(worst)) * 100);
        return (
          <div className="group-row" key={g.name}>
            <span className="group-name mono">{g.name}</span>
            <div className="group-track">
              <span className={`group-fill ${kindClass(slackKind(g.wns))}`} style={{ width: `${width}%` }} />
            </div>
            <span className="mono">{ns(g.wns)}</span>
            <span className="muted mono">{ns(g.nvp)} nvp</span>
          </div>
        );
      })}
    </div>
  );
}

export function ClockCongestion({
  clock,
  congestion,
}: {
  clock: ClockSnap | null;
  congestion: CongestionSnap | null;
}) {
  return (
    <dl className="kv-grid">
      <div>
        <dt>Clock latency</dt>
        <dd className="mono">{ns(clock?.latency ?? null)}</dd>
      </div>
      <div>
        <dt>Skew</dt>
        <dd className="mono">{ns(clock?.skew ?? null)}</dd>
      </div>
      <div>
        <dt>Uncertainty</dt>
        <dd className="mono">{ns(clock?.uncertainty ?? null)}</dd>
      </div>
      <div>
        <dt>Overflow H / V</dt>
        <dd className="mono">
          {ns(congestion?.overflow_h ?? null)}% / {ns(congestion?.overflow_v ?? null)}%
        </dd>
      </div>
      <div>
        <dt>Hotspots</dt>
        <dd className="mono">{ns(congestion?.hotspot ?? null)}</dd>
      </div>
    </dl>
  );
}

export function ThresholdLegend() {
  return (
    <p className="muted threshold-legend">
      Color rule (setup WNS): <Badge status="PASS" /> ≥ 0 ns · <Badge status="WARN" /> 0 to −0.05 ·{" "}
      <Badge status="FAIL" /> &lt; −0.05. Same colors on hold. NVP &gt; 0 is warn, not fail — count is not slack.
    </p>
  );
}
