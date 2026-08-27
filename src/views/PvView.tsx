/**
 * Block → PV tab. Hash: `#/project/<id>/block/<block>/pv`
 *
 * Tab enablement lives in `src/config.ts` (`STAGE_TABS`). This file is only the layout.
 */
export function PvView({ projectId, block }: { projectId: string; block: string }) {
  return (
    <section className="card">
      <div className="section-head">
        <h3>Physical verification Result</h3>
        <p className="muted">
          {projectId} / {block}. No PV payload is wired yet — this panel is the place to
          render LVS / Calibre DRC / antenna once those fields exist on the upload JSON.
        </p>
      </div>
      <p className="empty-panel">No PV results for this block yet.</p>
    </section>
  );
}
