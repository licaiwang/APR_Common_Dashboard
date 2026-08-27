import { DEFAULT_BLOCK_STAGE, stageLabel } from "../config";
import type { Route } from "../types";
import { blockHref, projectHref } from "./helpers";

export function Crumbs({ route }: { route: Route }) {
  const parts: Array<{ key: string; href?: string; label: string }> = [{ key: "home", href: "#/", label: "Home" }];

  if (route.view === "project" || route.view === "block" || route.view === "version" || route.view === "summary") {
    const id = route.projectId || "";
    parts.push({ key: "project", href: projectHref(id), label: id });
  }
  if (route.view === "summary") {
    parts.push({ key: "summary", label: "Summary" });
  }
  if (route.view === "block" || route.view === "version") {
    parts.push({
      key: "block",
      href: blockHref(route.projectId || "", route.block || "", route.stage || DEFAULT_BLOCK_STAGE),
      label: route.block || "",
    });
  }
  if (route.view === "block" && route.stage === "summary") {
    parts.push({ key: "block-summary", label: "Summary" });
  }
  if (route.view === "version") {
    parts.push({ key: "stage", label: stageLabel(route.stage || "") });
    parts.push({ key: "version", label: "version" });
  }

  return (
    <>
      {parts.map((part, idx) => (
        <span key={part.key}>
          {idx > 0 ? <span className="sep">/</span> : null}
          {part.href ? <a href={part.href}>{part.label}</a> : <span>{part.label}</span>}
        </span>
      ))}
    </>
  );
}
