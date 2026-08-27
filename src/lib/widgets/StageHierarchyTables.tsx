import { META_FIELDS, isMetricWidgetKeyword } from "../../config";
import { digPath, fmt, isPathishKey, isPathishValue } from "../../legacy/format";
import type { StageNode } from "../../types";

type Column = { group: string | null; label: string; path: string[] };

function columnsFromHierarchy(sectionObj: unknown): Column[] {
  const columns: Column[] = [];
  if (!sectionObj || typeof sectionObj !== "object" || Array.isArray(sectionObj)) {
    return columns;
  }

  const record = sectionObj as Record<string, unknown>;
  Object.keys(record)
    .sort()
    .forEach((level2) => {
      if (isPathishKey(level2) || isMetricWidgetKeyword(level2)) return;
      const value2 = record[level2];

      if (value2 === null || typeof value2 !== "object" || Array.isArray(value2)) {
        if (!isPathishValue(value2)) {
          columns.push({ group: null, label: level2, path: [level2] });
        }
        return;
      }

      const nested = value2 as Record<string, unknown>;
      Object.keys(nested)
        .sort()
        .forEach((level3) => {
          if (isPathishKey(level3) || isMetricWidgetKeyword(level3)) return;
          const value3 = nested[level3];

          if (value3 !== null && typeof value3 === "object" && !Array.isArray(value3)) {
            const leaves = value3 as Record<string, unknown>;
            Object.keys(leaves)
              .sort()
              .forEach((leaf) => {
                if (isPathishKey(leaf) || isMetricWidgetKeyword(leaf)) return;
                const leafVal = leaves[leaf];
                if (isPathishValue(leafVal)) return;
                if (leafVal !== null && typeof leafVal === "object") return;
                columns.push({
                  group: level2,
                  label: `${level3}.${leaf}`,
                  path: [level2, level3, leaf],
                });
              });
            return;
          }

          if (isPathishValue(value3)) return;
          columns.push({ group: level2, label: level3, path: [level2, level3] });
        });
    });

  return columns;
}

function sectionOf(node: StageNode, sectionName: string): Record<string, unknown> {
  if (sectionName === "meta") {
    return Object.fromEntries(META_FIELDS.map((k) => [k, node[k]]));
  }
  const metrics = node.metrics || {};
  const section = metrics[sectionName];
  return section && typeof section === "object" && !Array.isArray(section)
    ? (section as Record<string, unknown>)
    : {};
}

function mergeHierarchyColumns(chain: StageNode[], sectionName: string): Column[] {
  const seen = new Map<string, Column>();
  chain.forEach((node) => {
    columnsFromHierarchy(sectionOf(node, sectionName)).forEach((col) => {
      const id = col.path.join(".");
      if (!seen.has(id)) seen.set(id, col);
    });
  });
  return [...seen.values()];
}

function HierarchyTable({ title, chain, sectionName }: { title: string; chain: StageNode[]; sectionName: string }) {
  const columns = mergeHierarchyColumns(chain, sectionName);
  if (!columns.length) return null;

  const hasGroups = columns.some((col) => col.group);
  const groups: Array<{ name: string; span: number }> = [];
  if (hasGroups) {
    columns.forEach((col) => {
      const g = col.group || col.label;
      const last = groups[groups.length - 1];
      if (last && last.name === g) last.span += 1;
      else groups.push({ name: g, span: 1 });
    });
  }

  return (
    <section className="card hierarchy-table">
      <h2>{title}</h2>
      <div className="table-scroll">
        <table className="data diff-table stage-data-table">
          <thead>
            {hasGroups ? (
              <>
                <tr>
                  <th className="sticky-col" rowSpan={2}>
                    stage
                  </th>
                  {groups.map((g) => (
                    <th key={g.name} colSpan={g.span}>
                      {g.name}
                    </th>
                  ))}
                </tr>
                <tr>
                  {columns.map((col) => (
                    <th key={col.path.join(".")}>{col.label}</th>
                  ))}
                </tr>
              </>
            ) : (
              <tr>
                <th className="sticky-col">stage</th>
                {columns.map((col) => (
                  <th key={col.path.join(".")}>{col.label}</th>
                ))}
              </tr>
            )}
          </thead>
          <tbody>
            {chain.map((node) => {
              const section = sectionOf(node, sectionName);
              return (
                <tr key={node.id}>
                  <th className="sticky-col mono">{node.stage || "—"}</th>
                  {columns.map((col) => (
                    <td className="mono" key={col.path.join(".")}>
                      {fmt(digPath(section, col.path))}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function StageHierarchyTables({ chain }: { chain: StageNode[] }) {
  if (!chain.length) return null;

  const order: string[] = [];
  const seen = new Set<string>();
  chain.forEach((node) => {
    Object.keys(node.metrics || {}).forEach((key) => {
      if (seen.has(key) || isPathishKey(key) || isMetricWidgetKeyword(key)) return;
      seen.add(key);
      order.push(key);
    });
  });

  return (
    <>
      <HierarchyTable title="meta" chain={chain} sectionName="meta" />
      {order.map((sectionName) => (
        <HierarchyTable key={sectionName} title={sectionName} chain={chain} sectionName={sectionName} />
      ))}
    </>
  );
}
