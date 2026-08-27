import type { StageNode } from "../../types";
import {
  parseClock,
  parseCongestion,
  parseSlackHist,
  parseTiming,
  parseUrate,
  parseVt,
} from "./parse";
import {
  ClockCongestion,
  CornerTable,
  KpiStrip,
  PathGroupBars,
  SlackHistogram,
  ThresholdLegend,
  TimingHeatmap,
  UrateMeter,
  VtMixBar,
} from "./widgets";

export function TimingBoard({ node }: { node: StageNode }) {
  const metrics = (node.metrics || {}) as Record<string, unknown>;
  const timing = parseTiming(metrics);
  if (!timing) return null;

  const hist = parseSlackHist(metrics);
  const urate = parseUrate(metrics);
  const vt = parseVt(metrics);
  const clock = parseClock(metrics);
  const congestion = parseCongestion(metrics);

  return (
    <section className="card timing-board">
      <div className="section-head">
        <h3>Timing &amp; layout snapshot</h3>
        <p className="muted">
          Same numbers as the tables below, drawn so WNS / TNS / NVP can be scanned in a few seconds.
        </p>
      </div>
      <KpiStrip timing={timing} />
      <ThresholdLegend />
      <div className="board-grid">
        <div>
          <h4>Corners</h4>
          <TimingHeatmap timing={timing} />
        </div>
        <div>
          <h4>Path groups</h4>
          <PathGroupBars groups={timing.groups} />
        </div>
        {hist ? (
          <div>
            <h4>Slack histogram ({hist.unit})</h4>
            <SlackHistogram hist={hist} />
          </div>
        ) : null}
        {urate ? (
          <div>
            <h4>Utilization</h4>
            <UrateMeter urate={urate} />
          </div>
        ) : null}
        {vt.length ? (
          <div>
            <h4>VT mix</h4>
            <VtMixBar mix={vt} />
          </div>
        ) : null}
        <div>
          <h4>Clock &amp; congestion</h4>
          <ClockCongestion clock={clock} congestion={congestion} />
        </div>
      </div>
      <details className="corner-details">
        <summary>Corner table</summary>
        <CornerTable timing={timing} />
      </details>
    </section>
  );
}
