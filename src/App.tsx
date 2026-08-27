import { useEffect, useState } from "react";
// Exact-case import path (Linux FS is case-sensitive).
import { mountDashboard } from "./legacy/dashboard.js";
import type { DashboardSnapshot } from "./types";
import { Crumbs } from "./lib/Crumbs";
import { DashboardMain } from "./views/DashboardMain";

const INITIAL_VIEW: DashboardSnapshot = {
  kind: "loading",
  route: { view: "home" },
  subtitle: "Projects and blocks",
};

export function App() {
  const [view, setView] = useState<DashboardSnapshot>(INITIAL_VIEW);

  useEffect(() => mountDashboard({ onView: setView }), []);

  return (
    <div id="app">
      <header className="topbar">
        <div className="brand">
          <a href="#/" className="brand-link">
            <h1>APR Common Dashboard</h1>
          </a>
          <p className="subtitle" id="subtitle">
            {view.subtitle}
          </p>
        </div>
        <nav id="crumbs" className="crumbs" aria-label="Breadcrumb">
          <Crumbs route={view.route} />
        </nav>
      </header>
      <main id="main">
        <DashboardMain view={view} />
      </main>
    </div>
  );
}
