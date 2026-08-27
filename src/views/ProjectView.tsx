import { DEFAULT_BLOCK_STAGE } from "../config";
import { fmt } from "../legacy/format";
import type { BlockStatus, HierarchyRow } from "../types";
import { Badge, Chip, blockHref, summaryHref } from "../lib/helpers";

function HierarchyRowView({
  projectId,
  row,
  status,
  extraClass = "",
}: {
  projectId: string;
  row: HierarchyRow;
  status: BlockStatus;
  extraClass?: string;
}) {
  const indent = "\u00A0".repeat(row.depth * 4);
  const tag = row.isTop ? (
    <Chip kind="top" label="top" />
  ) : row.hasChildren ? (
    <Chip kind="uplevel" label={`Uplevel (${row.childCount})`} />
  ) : (
    <Chip kind="block" label="block" />
  );

  return (
    <tr className={extraClass || undefined}>
      <td className="mono">
        <span className="indent">{indent}</span>
        <a href={blockHref(projectId, row.name, DEFAULT_BLOCK_STAGE)}>{row.name}</a> {tag}
      </td>
      <td>{row.depth}</td>
      <td>{status.qa_status ? <Badge status={status.qa_status} /> : <span className="muted">—</span>}</td>
      <td>{status.apr_leaves ?? 0}</td>
      <td>{status.eco_leaves ?? 0}</td>
      <td className="mono">{fmt(status.upload_date)}</td>
    </tr>
  );
}

export function ProjectView({
  projectId,
  topName,
  rows,
  statusMap,
}: {
  projectId: string;
  topName: string | null;
  rows: HierarchyRow[];
  statusMap: Record<string, BlockStatus>;
}) {
  const bodyRows: HierarchyRow[] = [];
  if (topName) {
    bodyRows.push({ name: topName, depth: 0, isTop: true, hasChildren: false, childCount: 0, isLeaf: true });
  }
  bodyRows.push(...rows);

  return (
    <section className="card">
      <div className="section-head project-head">
        <div>
          <h2>{projectId}</h2>
          <p className="muted">Click a block to open SignOff / APR / ECO views, or open Summary for latest runs.</p>
        </div>
        <a className="btn" href={summaryHref(projectId)}>
          Latest summary
        </a>
      </div>
      <table className="hierarchy">
        <thead>
          <tr>
            <th>Block</th>
            <th>Level</th>
            <th>SignOff</th>
            <th>APR leaves</th>
            <th>ECO leaves</th>
            <th>Updated</th>
          </tr>
        </thead>
        <tbody>
          {bodyRows.length ? (
            bodyRows.map((row) => (
              <HierarchyRowView
                key={`${row.isTop ? "top" : "row"}-${row.name}-${row.depth}`}
                projectId={projectId}
                row={row}
                status={statusMap[row.name] || {}}
                extraClass={row.isTop ? "top-row" : ""}
              />
            ))
          ) : (
            <tr>
              <td colSpan={6} className="empty">
                Empty hierarchy.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}
