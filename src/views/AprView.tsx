import type { StageTree } from "../types";
import { StageLeafTable } from "../lib/StageLeafTable";

/**
 * Block → APR tab. Hash: `#/project/<id>/block/<block>/apr`
 */
export function AprView({
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
  return <StageLeafTable stageLabel={stageLabel} tree={tree} projectId={projectId} block={block} />;
}
