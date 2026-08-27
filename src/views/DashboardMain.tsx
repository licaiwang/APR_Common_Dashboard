import type { DashboardSnapshot } from "../types";
import { HomeView } from "./HomeView";
import { ProjectView } from "./ProjectView";
import { ProjectSummaryView } from "./SummaryView";
import { BlockView } from "./BlockView";
import { VersionMissingView, VersionView } from "./VersionView";

export function DashboardMain({ view }: { view: DashboardSnapshot }) {
  if (view.kind === "loading") {
    return <p className="muted">Loading…</p>;
  }
  if (view.kind === "error") {
    return <p className="error">{view.message}</p>;
  }
  if (view.kind === "home") {
    return <HomeView projects={view.projects} groups={view.groups} />;
  }
  if (view.kind === "project") {
    return (
      <ProjectView
        projectId={view.projectId}
        topName={view.topName}
        rows={view.rows}
        statusMap={view.statusMap}
      />
    );
  }
  if (view.kind === "summary") {
    return <ProjectSummaryView projectId={view.projectId} rows={view.rows} />;
  }
  if (view.kind === "block") {
    return (
      <BlockView
        projectId={view.projectId}
        block={view.block}
        stage={view.stage}
        meta={view.meta}
        body={view.body}
      />
    );
  }
  if (view.kind === "version-missing") {
    return <VersionMissingView stage={view.stage} backHref={view.backHref} />;
  }
  return (
    <VersionView
      projectId={view.projectId}
      block={view.block}
      stage={view.stage}
      node={view.node}
      tree={view.tree}
      chain={view.chain}
      backHref={view.backHref}
    />
  );
}
