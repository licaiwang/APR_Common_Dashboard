import { Fragment } from "react";
import type { StageNode, StageTree } from "../types";
import { lineageLabel, versionHref } from "../lib/helpers";
import { VersionMetrics } from "../lib/widgets";

export function VersionMissingView({ stage, backHref }: { stage: string; backHref: string }) {
  return (
    <>
      <p className="error">Version node not found in {stage} uploads.</p>
      <a className="btn" href={backHref}>
        ← Back to {stage.toUpperCase()}
      </a>
    </>
  );
}

export function VersionView({
  projectId,
  block,
  stage,
  node,
  tree,
  chain,
  backHref,
}: {
  projectId: string;
  block: string;
  stage: string;
  node: StageNode;
  tree: StageTree;
  chain: StageNode[];
  backHref: string;
}) {
  return (
    <>
      <div className="block-head">
        <div>
          <h2 className="mono">{node.version || node.id}</h2>
          <p className="muted">
            {projectId} / {block} · lineage {lineageLabel(tree, node)}
          </p>
        </div>
        <a className="btn" href={backHref}>
          ← {stage.toUpperCase()} leaves
        </a>
      </div>

      <section className="card lineage-strip">
        <div className="section-head">
          <h3>Lineage path</h3>
          <p className="muted">Father chain from root to the selected version.</p>
        </div>
        <ol className="lineage-steps">
          {chain.map((n, idx) => {
            const href = versionHref(projectId, block, stage, n.id);
            const current = n.id === node.id ? " current" : "";
            return (
              <Fragment key={n.id}>
                {idx > 0 ? (
                  <li className="lineage-arrow" aria-hidden="true">
                    →
                  </li>
                ) : null}
                <li className={`lineage-step${current}`}>
                  <a href={href}>
                    <span className="step-idx">{idx + 1}</span>
                    <span className="step-stage">{n.stage || "—"}</span>
                    <span className="step-ver mono">{n.version || n.id}</span>
                  </a>
                </li>
              </Fragment>
            );
          })}
        </ol>
      </section>
      <VersionMetrics node={node} chain={chain} />
    </>
  );
}
