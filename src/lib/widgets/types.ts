import type { StageNode } from "../../types";

export type MetricWidgetProps = {
  section: string;
  kind: string;
  node: StageNode;
  chain: StageNode[];
};
