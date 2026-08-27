import { STAGE_TABS } from "../config";
import type { BlockBody } from "../types";
import { blockHref, projectHref } from "../lib/helpers";
import { AprView } from "./AprView";
import { EcoView } from "./EcoView";
import { PlaceholderView } from "./PlaceholderView";
import { PvView } from "./PvView";
import { SignoffView } from "./SignoffView";
import { SummarySections } from "./SummaryView";

function StageBar({ projectId, block, activeStage }: { projectId: string; block: string; activeStage: string }) {
  return (
    <nav className="stage-bar" aria-label="Stage tabs">
      {STAGE_TABS.map((tab) => {
        const active = tab.id === activeStage ? " active" : "";
        const end = tab.align === "end" ? " stage-tab-end" : "";
        if (!tab.enabled) {
          return (
            <span key={tab.id} className={`stage-tab disabled${end}`} title="Coming later">
              {tab.label}
            </span>
          );
        }
        return (
          <a
            key={tab.id}
            className={`stage-tab${active}${end}`}
            href={blockHref(projectId, block, tab.id)}
          >
            {tab.label}
          </a>
        );
      })}
    </nav>
  );
}

function BlockBodyView({
  projectId,
  block,
  stage,
  body,
}: {
  projectId: string;
  block: string;
  stage: string;
  body: BlockBody;
}) {
  if (body.type === "signoff") return <SignoffView signoff={body.signoff} />;
  if (body.type === "tree") {
    const treeProps = { stageLabel: body.stageLabel, tree: body.tree, projectId, block };
    return stage === "eco" ? <EcoView {...treeProps} /> : <AprView {...treeProps} />;
  }
  if (body.type === "summary") {
    return <SummarySections projectId={projectId} rows={body.rows} showBlock={body.showBlock} />;
  }
  if (body.type === "pv") {
    return <PvView projectId={projectId} block={block} />;
  }
  return <PlaceholderView stage={body.stage} />;
}

/**
 * Block page shell: header + stage tabs. Each tab body lives in its own *View.tsx.
 */
export function BlockView({
  projectId,
  block,
  stage,
  meta,
  body,
}: {
  projectId: string;
  block: string;
  stage: string;
  meta: { version?: string; owner?: string; upload_date?: string };
  body: BlockBody;
}) {
  return (
    <>
      <div className="block-head">
        <div>
          <h2 className="mono">{block}</h2>
          <p className="muted">
            {projectId}
            {meta.version ? ` · ${meta.version}` : ""}
            {meta.owner ? ` · ${meta.owner}` : ""}
            {meta.upload_date ? ` · ${meta.upload_date}` : ""}
          </p>
        </div>
        <a className="btn" href={projectHref(projectId)}>
          ← Hierarchy
        </a>
      </div>
      <StageBar projectId={projectId} block={block} activeStage={stage} />
      <BlockBodyView projectId={projectId} block={block} stage={stage} body={body} />
    </>
  );
}
