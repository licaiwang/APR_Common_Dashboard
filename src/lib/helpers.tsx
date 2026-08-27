import { DEFAULT_BLOCK_STAGE } from "../config";
import type { MouseEvent, ReactNode } from "react";
import { fmt, qaClass } from "../legacy/format";
import type { StageNode, StageTree } from "../types";

export function versionHref(projectId: string, block: string, stage: string, nodeId: string) {
  return `#/project/${encodeURIComponent(projectId)}/block/${encodeURIComponent(block)}/${encodeURIComponent(stage)}/version/${encodeURIComponent(nodeId)}`;
}

export function projectHref(projectId: string) {
  return `#/project/${encodeURIComponent(projectId)}`;
}

export function blockHref(projectId: string, block: string, stage = DEFAULT_BLOCK_STAGE) {
  return `#/project/${encodeURIComponent(projectId)}/block/${encodeURIComponent(block)}/${encodeURIComponent(stage)}`;
}

export function summaryHref(projectId: string) {
  return `#/project/${encodeURIComponent(projectId)}/summary`;
}

export function lineageLabel(tree: StageTree, node: StageNode) {
  return (node.path_to_root || [])
    .map((id) => {
      const n = tree.nodes[id];
      return n ? `${n.stage || "?"} (${n.version || n.id})` : id;
    })
    .join(" → ");
}

export function Badge({ status }: { status: unknown }) {
  return <span className={qaClass(status)}>{String(status ?? "")}</span>;
}

export function Chip({ kind, label }: { kind: string; label: string }) {
  return <span className={`chip chip-${kind}`}>{label}</span>;
}

export function SummaryCell({ value, asBadge = false }: { value: unknown; asBadge?: boolean }) {
  if (value === null || value === undefined || value === "") {
    return <span className="muted">—</span>;
  }
  if (asBadge) return <Badge status={value} />;
  return <span className="mono">{fmt(value)}</span>;
}

function goToHash(href: string) {
  location.hash = href.startsWith("#") ? href : `#${href}`;
}

export function ClickableRow({ href, children }: { href: string; children: ReactNode }) {
  const onClick = (ev: MouseEvent<HTMLTableRowElement>) => {
    if ((ev.target as HTMLElement).closest("a")) return;
    goToHash(href);
  };
  return (
    <tr className="clickable" onClick={onClick}>
      {children}
    </tr>
  );
}
