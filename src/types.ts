export type Route = {
  view: "home" | "project" | "summary" | "block" | "version";
  projectId?: string;
  block?: string;
  stage?: string;
  nodeId?: string;
};

export type ProjectCard = {
  id: string;
  process?: string;
  project: string;
  blocks?: string[];
};

export type ProcessGroup = {
  process: string;
  items: ProjectCard[];
};

export type HierarchyRow = {
  name: string;
  depth: number;
  isLeaf: boolean;
  hasChildren: boolean;
  childCount: number;
  isTop?: boolean;
};

export type BlockStatus = {
  qa_status?: string | null;
  apr_leaves?: number;
  eco_leaves?: number;
  upload_date?: string;
};

export type AprFields = {
  id: string;
  version?: string;
  stage?: string;
  owner?: string;
  upload_date?: string;
  runtime?: string;
  drc?: unknown;
  drc_short?: unknown;
  urate?: unknown;
  detour_vio?: unknown;
  wns?: unknown;
  tns?: unknown;
  nvp?: unknown;
  hold_wns?: unknown;
};

export type SignoffFields = {
  id?: string;
  version?: string;
  upload_date?: string;
  qa_stage?: string;
  track?: string;
  qa_status?: string;
  pass_num?: unknown;
  fail_num?: unknown;
  warn_num?: unknown;
  item_num?: unknown;
};

export type SummaryRows = {
  apr: Array<{ block: string; fields: AprFields | null }>;
  signoff: Array<{ block: string; fields: SignoffFields | null }>;
};

export type QaCheck = {
  name: string;
  status?: string;
  value?: unknown;
  criteria?: unknown;
};

export type Signoff = {
  qa_status?: string;
  pass_num?: unknown;
  fail_num?: unknown;
  warn_num?: unknown;
  item_num?: unknown;
  process?: string;
  track?: string;
  checks?: QaCheck[];
};

export type StageNode = {
  id: string;
  stage?: string;
  version?: string;
  father?: string | null;
  path_to_root?: string[];
  upload_date?: string;
  metrics?: Record<string, any>;
  [key: string]: unknown;
};

export type StageTree = {
  stage: string;
  count: number;
  leaves: string[];
  roots?: string[];
  nodes: Record<string, StageNode>;
};

export type BlockBody =
  | { type: "signoff"; signoff: Signoff | null }
  | { type: "tree"; stageLabel: string; tree: StageTree | null }
  | { type: "summary"; rows: SummaryRows; showBlock: boolean }
  | { type: "pv" }
  | { type: "placeholder"; stage: string };

type SnapshotBase = {
  route: Route;
  subtitle: string;
};

export type DashboardSnapshot =
  | (SnapshotBase & { kind: "loading" })
  | (SnapshotBase & { kind: "error"; message: string })
  | (SnapshotBase & { kind: "home"; projects: ProjectCard[]; groups: ProcessGroup[] })
  | (SnapshotBase & {
      kind: "project";
      projectId: string;
      topName: string | null;
      rows: HierarchyRow[];
      statusMap: Record<string, BlockStatus>;
    })
  | (SnapshotBase & { kind: "summary"; projectId: string; rows: SummaryRows })
  | (SnapshotBase & {
      kind: "block";
      projectId: string;
      block: string;
      stage: string;
      meta: { version?: string; owner?: string; upload_date?: string };
      body: BlockBody;
    })
  | (SnapshotBase & { kind: "version-missing"; stage: string; backHref: string })
  | (SnapshotBase & {
      kind: "version";
      projectId: string;
      block: string;
      stage: string;
      node: StageNode;
      tree: StageTree;
      chain: StageNode[];
      backHref: string;
    });
