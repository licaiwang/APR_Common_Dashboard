import type { ReactElement } from "react";
import { METRIC_WIDGET_KEYWORDS } from "../../config";
import type { StageNode } from "../../types";
import { StageHierarchyTables } from "./StageHierarchyTables";
import { TimeTableWidget } from "./TimeTable";
import type { MetricWidgetProps } from "./types";

const WIDGETS: Record<string, (props: MetricWidgetProps) => ReactElement | null> = {
  time_table: TimeTableWidget,
};

function collectWidgetBlocks(chain: StageNode[]) {
  const blocks: Array<{ section: string; kind: string }> = [];
  const seen = new Set<string>();
  chain.forEach((node) => {
    Object.entries(node.metrics || {}).forEach(([section, body]) => {
      if (!body || typeof body !== "object" || Array.isArray(body)) return;
      const record = body as Record<string, unknown>;
      METRIC_WIDGET_KEYWORDS.forEach((kind) => {
        const id = `${section}:${kind}`;
        if (seen.has(id) || !Object.prototype.hasOwnProperty.call(record, kind)) return;
        seen.add(id);
        blocks.push({ section, kind });
      });
    });
  });
  return blocks;
}

/** Version-page metric panels: keyword widgets first, then generic hierarchy tables. */
export function VersionMetrics({ node, chain }: { node: StageNode; chain: StageNode[] }) {
  const widgets = collectWidgetBlocks(chain);
  return (
    <>
      {widgets.map((block) => {
        const Widget = WIDGETS[block.kind];
        if (!Widget) return null;
        return (
          <Widget
            key={`${block.section}:${block.kind}`}
            section={block.section}
            kind={block.kind}
            node={node}
            chain={chain}
          />
        );
      })}
      <StageHierarchyTables chain={chain} />
    </>
  );
}

export { StageHierarchyTables };
export type { MetricWidgetProps };
