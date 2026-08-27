import { fmt } from "../legacy/format";
import type { StageTree } from "../types";
import { ClickableRow, lineageLabel, versionHref } from "./helpers";

/** Shared APR/ECO leaf table. Views pass the stage label and tree. */
export function StageLeafTable({
  stageLabel,
  tree,
  projectId,
  block,
}: {
  stageLabel: string;
  tree: StageTree | null;
  projectId: string;
  block: string;
}) {
  if (!tree || !tree.count) {
    return (
      <section className="card placeholder">
        <h3>{stageLabel}</h3>
        <p className="muted">
          No {stageLabel} uploads for this block yet. Lineage reads the top-level <code>father</code> field on each JSON
          and matches it to another file's <code>upload_id</code>. Empty father = root.
        </p>
      </section>
    );
  }

  const leaves = (tree.leaves || [])
    .map((id) => tree.nodes[id])
    .filter((node): node is NonNullable<typeof node> => Boolean(node));

  return (
    <section className="card">
      <div className="section-head">
        <h3>{stageLabel} · leaf nodes</h3>
        <p className="muted">
          {tree.leaves.length} leaf / {tree.count} total · roots: {(tree.roots || []).length}. Click a{" "}
          <strong>version</strong> to open stage-diff detail.
        </p>
      </div>
      <table className="data leaf-table">
        <thead>
          <tr>
            <th>Version</th>
            <th>History</th>
            <th>WNS</th>
            <th>TNS</th>
            <th>DRC</th>
            <th>Urate</th>
            <th>Uploaded</th>
          </tr>
        </thead>
        <tbody>
          {leaves.map((node) => {
            const href = versionHref(projectId, block, tree.stage, node.id);
            return (
              <ClickableRow key={node.id} href={href}>
                <td className="mono">
                  <a href={href}>{node.version || node.id}</a>
                </td>
                <td className="mono lineage">{lineageLabel(tree, node)}</td>
                <td className="mono">{fmt(node.metrics?.timing?.wns)}</td>
                <td className="mono">{fmt(node.metrics?.timing?.tns)}</td>
                <td>{fmt(node.metrics?.drc?.all?.value ?? node.metrics?.drc_all)}</td>
                <td>{fmt(node.metrics?.urate?.DESIGN)}</td>
                <td className="mono">{fmt(node.upload_date)}</td>
              </ClickableRow>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
