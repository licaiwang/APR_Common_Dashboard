import type { StageTree } from "../types";
import { StageLeafTable } from "../lib/StageLeafTable";

/**
 * Block → ECO tab. Hash: `#/project/<id>/block/<block>/eco`
 * Same leaf table as APR; the tree is the ECO upload lineage.
 */
export function EcoView({
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
