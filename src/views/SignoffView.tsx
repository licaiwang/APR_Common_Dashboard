import { fmt } from "../legacy/format";
import type { Signoff } from "../types";
import { Badge } from "../lib/helpers";

/**
 * Block → SignOff tab. Hash: `#/project/<id>/block/<block>/signoff`
 */
export function SignoffView({ signoff }: { signoff: Signoff | null }) {
  if (!signoff) {
    return (
      <p className="empty-panel">
        No <code>stage_qa</code> SignOff data for this block yet.
      </p>
    );
  }
  const checks = signoff.checks || [];
  return (
    <section className="card">
      <div className="section-head">
        <h3>SignOff · Stage QA</h3>
        <p className="muted">
          <Badge status={signoff.qa_status} /> {fmt(signoff.pass_num)}/{fmt(signoff.item_num)} pass · fail{" "}
          {fmt(signoff.fail_num)} · warn {fmt(signoff.warn_num)}
          {signoff.process ? ` · ${signoff.process}` : ""}
          {signoff.track ? ` · ${signoff.track}` : ""}
        </p>
      </div>
      <table className="data">
        <thead>
          <tr>
            <th>Check</th>
            <th>Status</th>
            <th>Value</th>
            <th>Criteria</th>
          </tr>
        </thead>
        <tbody>
          {checks.length ? (
            checks.map((c) => {
              const value = c.value !== null && typeof c.value === "object" ? JSON.stringify(c.value) : fmt(c.value);
              const criteria =
                c.criteria !== null && typeof c.criteria === "object" ? JSON.stringify(c.criteria) : fmt(c.criteria);
              return (
                <tr key={c.name}>
                  <td className="mono">{c.name}</td>
                  <td>
                    <Badge status={c.status} />
                  </td>
                  <td className="mono">{value}</td>
                  <td className="mono">{criteria}</td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={4} className="empty">
                No checks listed.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}
