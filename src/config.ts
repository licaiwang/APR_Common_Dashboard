/**
 * Project-wide UI / routing constants.
 * Enable a block tab, set its body kind, or add a meta column here — not in each view.
 */

export type BlockBodyKind = "tree" | "signoff" | "summary" | "pv" | "placeholder" ;

export type StageTab = {
  id: string;
  label: string;
  enabled: boolean;
  body: BlockBodyKind;
  align?: "end";
};

export const STAGE_TABS: StageTab[] = [
  { id: "apr", label: "APR", enabled: true, body: "tree" },
  { id: "eco", label: "ECO", enabled: true, body: "tree" },
  { id: "signoff", label: "SignOff", enabled: true, body: "signoff" },
  { id: "pv", label: "PV", enabled: true, body: "pv" },
  { id: "sta", label: "STA", enabled: false, body: "placeholder" },
  { id: "ir", label: "IREM", enabled: false, body: "placeholder" },
  { id: "dsv", label: "DSV", enabled: false, body: "placeholder" },
  { id: "summary", label: "Summary", enabled: true, body: "summary", align: "end" },
];

/** Hash fallback and hierarchy-row links. First enabled tree tab. */
export const DEFAULT_BLOCK_STAGE =
  STAGE_TABS.find((tab) => tab.enabled && tab.body === "tree")?.id ?? "apr";

export const SIGNOFF_STAGE_ID = STAGE_TABS.find((tab) => tab.body === "signoff")?.id ?? "signoff";

export const TREE_STAGE_IDS = STAGE_TABS.filter((tab) => tab.body === "tree").map((tab) => tab.id);

const ALLOWED_BLOCK_STAGES = new Set(STAGE_TABS.filter((tab) => tab.enabled).map((tab) => tab.id));

export function isAllowedBlockStage(stage: string): boolean {
  return ALLOWED_BLOCK_STAGES.has(stage);
}

export function stageTab(stage: string): StageTab | undefined {
  return STAGE_TABS.find((tab) => tab.id === stage);
}

export function stageLabel(stage: string): string {
  return stageTab(stage)?.label ?? String(stage || "").toUpperCase();
}

export function blockBodyKind(stage: string): BlockBodyKind {
  return stageTab(stage)?.body ?? "placeholder";
}

/** Upload filename / JSON `stage` → APR vs ECO tree. */
export function classifyFlowStage(sourceName: unknown, stage: unknown): string {
  const name = String(sourceName || "").toLowerCase();
  const st = String(stage || "").toLowerCase();
  if (name.includes("%eco%") || st === "eco") return "eco";
  return "apr";
}

/** Version-page "meta" table columns (fields on the stage node). */
export const META_FIELDS = ["version", "owner", "uploader", "upload_date", "runtime", "design"] as const;

/**
 * Keys under `item.<section>` that render via `src/lib/widgets` instead of StageHierarchyTables.
 * Add a keyword here, extract it in `extractMetrics`, and register a component in `lib/widgets`.
 */
export const METRIC_WIDGET_KEYWORDS = ["time_table"] as const;
export type MetricWidgetKeyword = (typeof METRIC_WIDGET_KEYWORDS)[number];

export function isMetricWidgetKeyword(key: unknown): boolean {
  return (METRIC_WIDGET_KEYWORDS as readonly string[]).includes(String(key));
}

/** Keys/values that look like filesystem paths; stripped before metrics hit the UI. */
export const PATHISH_KEY_HINTS = [
  "picture",
  "report",
  "html",
  "tkgui",
  "path",
  "dir",
  "file",
  "gif",
  "source_file",
  "work_dir",
  "upload_id",
  "file_name",
  "detail_file",
];

export const QA_BADGE_CLASS: Record<string, string> = {
  PASS: "badge pass",
  FAIL: "badge fail",
  WARN: "badge warn",
  UNKNOWN: "badge unknown",
};
