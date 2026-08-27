import type { ProcessGroup, ProjectCard } from "../types";
import { projectHref } from "../lib/helpers";

export function HomeView({ projects, groups }: { projects: ProjectCard[]; groups: ProcessGroup[] }) {
  if (!projects.length) {
    return (
      <p className="empty-panel">
        No design files found under <code>dist/design/</code>. Add hierarchy JSON like <code>N4_SM8466.json</code> and
        rebuild.
      </p>
    );
  }

  return (
    <>
      {groups.map((group) => (
        <section className="process-group" key={group.process}>
          <header className="process-header">
            <h2>{group.process}</h2>
            <p className="muted">
              {group.items.length} project{group.items.length === 1 ? "" : "s"}
            </p>
          </header>
          <div className="entrance-grid">
            {group.items.map((p) => (
              <a className="project-card" href={projectHref(p.id)} key={p.id}>
                <div className="card-project">{p.project}</div>
                <div className="card-meta">
                  <span>{(p.blocks || []).length} blocks</span>
                </div>
              </a>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
