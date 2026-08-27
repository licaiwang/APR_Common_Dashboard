/**
 * APR dashboard data, routing, and orchestration.
 * React views subscribe via mountDashboard({ onView }). Keep import path case exact for Linux.
 */
import { designJsonUrl, projectUploadsApiUrl, uploadJsonUrl } from "../lib/uploadUrl";
import {
  DEFAULT_BLOCK_STAGE,
  METRIC_WIDGET_KEYWORDS,
  TREE_STAGE_IDS,
  blockBodyKind,
  classifyFlowStage,
  isAllowedBlockStage,
  stageLabel,
} from "../config";
import { digPath, isPathishKey, isPathishValue } from "./format";

const state = {
  data: null, // { projects } from dist/design; uploads loaded per project card
  uploadsByProject: {}, // `${process}/${project}` → normalized uploads
  projectCache: {},
  treeCache: {},
  route: { view: "home" },
  error: null,
};

let onView = null;
let lastSubtitle = "Projects and blocks";

function parseHash() {
  const raw = location.hash.replace(/^#\/?/, "");
  if (!raw) return { view: "home" };

  const parts = raw.split("/").map(decodeURIComponent);
  if (parts[0] === "project" && parts[1] && parts.length === 2) {
    return { view: "project", projectId: parts[1] };
  }

  if (parts[0] === "project" && parts[1] && parts[2] === "summary" && parts.length === 3) {
    return { view: "summary", projectId: parts[1] };
  }

  // project/<id>/block/<block>/<stage>/version/<nodeId>
  if (
    parts[0] === "project" &&
    parts[1] &&
    parts[2] === "block" &&
    parts[3] &&
    parts[5] === "version" &&
    parts[6]
  ) {
    return {
      view: "version",
      projectId: parts[1],
      block: parts[3],
      stage: (parts[4] || DEFAULT_BLOCK_STAGE).toLowerCase(),
      nodeId: parts[6],
    };
  }

  // project/<id>/block/<block>/<stage?>
  if (parts[0] === "project" && parts[1] && parts[2] === "block" && parts[3]) {
    const stage = (parts[4] || DEFAULT_BLOCK_STAGE).toLowerCase();
    return {
      view: "block",
      projectId: parts[1],
      block: parts[3],
      stage,
    };
  }
  return { view: "home" };
}

function go(hash) {
  location.hash = hash.startsWith("#") ? hash : `#${hash}`;
}

async function fetchJson(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load ${url} (${res.status})`);
  return res.json();
}

function dig(obj, ...keys) {
  let cur = obj;
  for (const key of keys) {
    if (cur == null || typeof cur !== "object" || !(key in cur)) return undefined;
    cur = cur[key];
  }
  return cur;
}

function scrubPaths(obj) {
  if (Array.isArray(obj)) return obj.map(scrubPaths);
  if (!obj || typeof obj !== "object") {
    return isPathishValue(obj) ? undefined : obj;
  }
  const out = {};
  Object.entries(obj).forEach(([key, value]) => {
    if (isPathishKey(key)) return;
    const cleaned = scrubPaths(value);
    if (cleaned === undefined) return;
    if (isPathishValue(cleaned)) return;
    out[key] = cleaned;
  });
  return out;
}

function qaStatus(failNum, warnNum, passNum, itemNum) {
  if (failNum > 0) return "FAIL";
  if (warnNum > 0) return "WARN";
  if (itemNum && passNum === itemNum) return "PASS";
  if (passNum && !failNum) return "PASS";
  return "UNKNOWN";
}

function safeId(raw) {
  return String(raw || "upload")
    .replace(/[^A-Za-z0-9._-]+/g, "_")
    .replace(/^[._-]+|[._-]+$/g, "") || "upload";
}

function extractMetrics(payload) {
  const item = payload.item || {};
  const metrics = {};
  Object.entries(item).forEach(([section, body]) => {
    if (section === "stage_qa") return;
    if (!body || typeof body !== "object" || Array.isArray(body)) return;
    const out = {};
    const data = body.data;
    if (data && typeof data === "object") {
      const cleaned = scrubPaths(data);
      if (cleaned && typeof cleaned === "object" && !Array.isArray(cleaned) && Object.keys(cleaned).length) {
        Object.assign(out, cleaned);
      }
    }
    METRIC_WIDGET_KEYWORDS.forEach((keyword) => {
      if (!Object.prototype.hasOwnProperty.call(body, keyword)) return;
      const cleaned = scrubPaths(body[keyword]);
      if (cleaned !== undefined) out[keyword] = cleaned;
    });
    if (Object.keys(out).length) metrics[section] = out;
  });
  return metrics;
}

function extractSignoff(payload, process) {
  const section = dig(payload, "item", "stage_qa");
  if (!section || typeof section !== "object") return null;
  const data = section.data || {};
  const passNum = Number(data.pass_num || 0);
  const failNum = Number(data.fail_num || 0);
  const warnNum = Number(data.warn_num || 0);
  const itemNum = Number(data.item_num || 0);
  const checks = Object.keys(data.item_info || {})
    .sort()
    .map((name) => {
      const info = data.item_info[name] || {};
      return {
        name,
        status: info.status || "UNKNOWN",
        value: info.value,
        criteria: info.criteria,
      };
    });
  return {
    stage: data.stage,
    process: data.process || process,
    track: data.track,
    qa_version: data.qa_version,
    date: data.date,
    pass_num: passNum,
    fail_num: failNum,
    warn_num: warnNum,
    item_num: itemNum,
    unchecked_num: Number(data.unchecked_num || 0),
    qa_status: qaStatus(failNum, warnNum, passNum, itemNum),
    checks,
  };
}

function normalizeUpload(payload, sourceFile, usedIds, folderMeta = null) {
  const uploadId = payload.upload_id || payload.file_name || sourceFile;
  let id = safeId(uploadId);
  if (usedIds[id] != null) {
    usedIds[id] += 1;
    id = `${id}_${String(usedIds[id]).padStart(2, "0")}`;
  } else {
    usedIds[id] = 0;
  }

  const process =
    folderMeta?.process ||
    dig(payload, "item", "stage_qa", "data", "process") ||
    dig(payload, "item", "design_info", "data", "process_node") ||
    "UNKNOWN";
  const designName = dig(payload, "item", "design_info", "data", "design_name");
  const block = designName || String(payload.design || "").split("@")[0] || "";
  const fatherRaw = payload.father;
  const father =
    fatherRaw == null ||
    String(fatherRaw).trim() === "" ||
    ["null", "none", "root", "-"].includes(String(fatherRaw).trim().toLowerCase())
      ? null
      : String(fatherRaw).trim();

  const signoff = extractSignoff(payload, process);
  return {
    id,
    upload_id: uploadId,
    file_name: payload.file_name || "",
    source_file: sourceFile,
    father,
    process: String(process),
    project: folderMeta?.project || payload.project || "",
    block,
    design: payload.design || "",
    stage: payload.stage || "",
    flow_stage: classifyFlowStage(sourceFile, payload.stage),
    version: payload.version || "",
    uploader: payload.uploader || "",
    owner: payload.owner || "",
    upload_date: payload.upload_date || "",
    runtime: payload.runtime || "",
    userinfo: payload.userinfo || {},
    has_signoff: Boolean(signoff),
    signoff,
    metrics: extractMetrics(payload),
  };
}

function collectHierarchyBlocks(node, out = []) {
  if (Array.isArray(node)) {
    node.forEach((item) => collectHierarchyBlocks(item, out));
    return out;
  }
  if (!node || typeof node !== "object") return out;
  Object.entries(node).forEach(([key, value]) => {
    if (key === "subblocks") {
      collectHierarchyBlocks(value, out);
      return;
    }
    if (key === "top") {
      if (typeof value === "string" && value.trim()) out.push(value.trim());
      return;
    }
    out.push(key);
    collectHierarchyBlocks(value, out);
  });
  return out;
}

function parseDesignName(filename) {
  const m = String(filename).match(/^([^_]+)_(.+)\.json$/i);
  if (!m) return null;
  return { process: m[1], project: m[2], id: `${m[1]}_${m[2]}` };
}

function projectUploadKey(process, project) {
  return `${process}/${project}`;
}

async function loadData() {
  if (state.data) return state.data;

  const catalog = await fetchJson("/api/catalog");
  const projects = [];
  for (const name of catalog.design || []) {
    const parsed = parseDesignName(name);
    if (!parsed) continue;
    const hierarchy = await fetchJson(designJsonUrl(name));
    let walk = hierarchy;
    if (
      hierarchy &&
      typeof hierarchy === "object" &&
      hierarchy[parsed.id] &&
      Object.keys(hierarchy).length === 1
    ) {
      walk = hierarchy[parsed.id];
    }
    const blocks = [];
    const seen = new Set();
    collectHierarchyBlocks(walk).forEach((b) => {
      if (!seen.has(b)) {
        seen.add(b);
        blocks.push(b);
      }
    });
    projects.push({
      id: parsed.id,
      process: parsed.process,
      project: parsed.project,
      file: `design/${name}`,
      blocks,
    });
    state.projectCache[parsed.id] = hierarchy;
  }

  state.data = { projects };
  return state.data;
}

async function loadProjectUploads(process, project) {
  const key = projectUploadKey(process, project);
  if (Object.prototype.hasOwnProperty.call(state.uploadsByProject, key)) {
    return state.uploadsByProject[key];
  }

  const catalog = await fetchJson(projectUploadsApiUrl(process, project));
  const names = catalog.uploads || [];
  const folderMeta = { process, project };
  const payloads = await Promise.all(
    names.map(async (name) => {
      const payload = await fetchJson(uploadJsonUrl(name, process, project));
      return { name, payload };
    })
  );
  const usedIds = {};
  const uploads = payloads.map(({ name, payload }) => normalizeUpload(payload, name, usedIds, folderMeta));
  uploads.sort((a, b) => (b.upload_date || "").localeCompare(a.upload_date || ""));
  state.uploadsByProject[key] = uploads;
  return uploads;
}

function projectMeta(projectId) {
  return (state.data?.projects || []).find((p) => p.id === projectId);
}

async function loadHierarchy(projectId) {
  if (state.projectCache[projectId]) return state.projectCache[projectId];
  const meta = projectMeta(projectId);
  const file = meta?.file || `design/${projectId}.json`;
  const data = await fetchJson(file);
  state.projectCache[projectId] = data;
  return data;
}

function uploadsForProject(process, project) {
  return state.uploadsByProject[projectUploadKey(process, project)] || [];
}

function uploadsForBlock(process, project, block, flowStage = null) {
  return uploadsForProject(process, project).filter((u) => {
    if (u.block !== block) return false;
    if (flowStage && u.flow_stage !== flowStage) return false;
    return true;
  });
}

/** Child JSON `father` must equal another JSON's `upload_id` (or `file_name`). */
function resolveFatherId(fatherRef, uploads) {
  if (!fatherRef) return null;
  const hit = uploads.find((u) => u.upload_id === fatherRef || u.file_name === fatherRef);
  return hit ? hit.id : null;
}

function pathToRoot(nodeId, fatherOf) {
  const path = [];
  const seen = new Set();
  let cur = nodeId;
  while (cur) {
    if (seen.has(cur)) break;
    seen.add(cur);
    path.push(cur);
    cur = fatherOf[cur] || null;
  }
  path.reverse();
  return path;
}

/** Build APR/ECO father tree in the browser from dist/uploads JSON */
function buildStageTree(process, project, block, flowStage) {
  const key = `${process}/${project}/${block}/${flowStage}`;
  if (Object.prototype.hasOwnProperty.call(state.treeCache, key)) {
    return state.treeCache[key];
  }

  const uploads = uploadsForBlock(process, project, block, flowStage);
  if (!uploads.length) {
    state.treeCache[key] = null;
    return null;
  }

  const nodesById = {};
  uploads.forEach((u) => {
    nodesById[u.id] = u;
  });

  const fatherOf = {};
  const childrenOf = {};
  Object.keys(nodesById).forEach((id) => {
    childrenOf[id] = [];
  });

  Object.values(nodesById).forEach((upload) => {
    let resolved = resolveFatherId(upload.father, uploads);
    if (resolved === upload.id) resolved = null;
    if (resolved && !nodesById[resolved]) resolved = null;
    fatherOf[upload.id] = resolved;
    if (resolved) childrenOf[resolved].push(upload.id);
  });

  Object.values(childrenOf).forEach((kids) => {
    kids.sort((a, b) => (nodesById[a].upload_date || "").localeCompare(nodesById[b].upload_date || ""));
  });

  const nodes = {};
  const roots = [];
  const leaves = [];
  Object.values(nodesById).forEach((upload) => {
    const kids = childrenOf[upload.id] || [];
    const isLeaf = kids.length === 0;
    const isRoot = !fatherOf[upload.id];
    if (isRoot) roots.push(upload.id);
    if (isLeaf) leaves.push(upload.id);
    nodes[upload.id] = {
      id: upload.id,
      father: fatherOf[upload.id],
      children: kids,
      is_leaf: isLeaf,
      is_root: isRoot,
      version: upload.version || "",
      owner: upload.owner || "",
      uploader: upload.uploader || "",
      upload_date: upload.upload_date || "",
      runtime: upload.runtime || "",
      design: upload.design || "",
      stage: upload.stage || "",
      path_to_root: pathToRoot(upload.id, fatherOf),
      metrics: upload.metrics || {},
      source_file: upload.source_file || "",
    };
  });

  roots.sort((a, b) => (nodes[a].upload_date || "").localeCompare(nodes[b].upload_date || ""));
  leaves.sort((a, b) => (nodes[b].upload_date || "").localeCompare(nodes[a].upload_date || ""));

  const tree = {
    process,
    project,
    block,
    stage: flowStage,
    count: Object.keys(nodes).length,
    roots,
    leaves,
    nodes,
  };
  state.treeCache[key] = tree;
  return tree;
}

function latestSignoff(process, project, block) {
  const list = uploadsForBlock(process, project, block)
    .filter((u) => u.has_signoff && u.signoff)
    .sort((a, b) => (b.upload_date || "").localeCompare(a.upload_date || ""));
  return list[0] || null;
}

function latestUpload(process, project, block, flowStage) {
  return (
    uploadsForBlock(process, project, block, flowStage)
      .slice()
      .sort((a, b) => (b.upload_date || "").localeCompare(a.upload_date || ""))[0] || null
  );
}

function unwrapMetric(value) {
  if (value && typeof value === "object" && !Array.isArray(value) && "value" in value) {
    return value.value;
  }
  return value;
}

function aprLatestFields(upload) {
  if (!upload) return null;
  const m = upload.metrics || {};
  return {
    id: upload.id,
    version: upload.version || upload.id,
    stage: upload.stage || "",
    owner: upload.owner || "",
    upload_date: upload.upload_date || "",
    runtime: upload.runtime || "",
    drc: unwrapMetric(digPath(m, ["drc", "all"])) ?? m.drc_all,
    drc_short: unwrapMetric(digPath(m, ["drc", "short"])),
    urate: digPath(m, ["urate", "DESIGN"]),
    detour_vio: digPath(m, ["detour", "vio_count"]),
    wns: digPath(m, ["timing", "wns"]),
    tns: digPath(m, ["timing", "tns"]),
    nvp: digPath(m, ["timing", "nvp"]),
    hold_wns: digPath(m, ["timing", "hold_wns"]),
  };
}

function signoffLatestFields(upload) {
  if (!upload?.signoff) return null;
  const s = upload.signoff;
  return {
    id: upload.id,
    version: upload.version || "",
    upload_date: upload.upload_date || s.date || "",
    qa_stage: s.stage || upload.stage || "",
    track: s.track || "",
    qa_status: s.qa_status || "UNKNOWN",
    pass_num: s.pass_num,
    fail_num: s.fail_num,
    warn_num: s.warn_num,
    item_num: s.item_num,
  };
}

function collectSummaryRows(projectId, blockNames) {
  const meta = projectMeta(projectId);
  if (!meta) return { apr: [], signoff: [] };
  const apr = [];
  const signoff = [];
  blockNames.forEach((block) => {
    const aprUpload = latestUpload(meta.process, meta.project, block, DEFAULT_BLOCK_STAGE);
    const soUpload = latestSignoff(meta.process, meta.project, block);
    apr.push({ block, fields: aprLatestFields(aprUpload) });
    signoff.push({ block, fields: signoffLatestFields(soUpload) });
  });
  return { apr, signoff };
}

function unwrapProjectHierarchy(projectId) {
  let hierarchy = state.projectCache[projectId];
  if (
    hierarchy &&
    typeof hierarchy === "object" &&
    !Array.isArray(hierarchy) &&
    hierarchy[projectId] &&
    Object.keys(hierarchy).length === 1
  ) {
    hierarchy = hierarchy[projectId];
  }
  return hierarchy;
}

function blockStats(process, project, block) {
  const signoffUpload = latestSignoff(process, project, block);
  const trees = Object.fromEntries(
    TREE_STAGE_IDS.map((id) => [id, buildStageTree(process, project, block, id)])
  );
  const apr = trees.apr;
  const eco = trees.eco;
  const newest = uploadsForBlock(process, project, block).sort((a, b) =>
    (b.upload_date || "").localeCompare(a.upload_date || "")
  )[0];
  return {
    qa_status: signoffUpload?.signoff?.qa_status || null,
    apr_leaves: apr ? apr.leaves.length : 0,
    eco_leaves: eco ? eco.leaves.length : 0,
    upload_date: newest?.upload_date || "",
    signoff: signoffUpload?.signoff || null,
    meta: newest || null,
  };
}

function publish(partial) {
  const snapshot = {
    route: state.route,
    subtitle: lastSubtitle,
    ...partial,
  };
  if (snapshot.subtitle) lastSubtitle = snapshot.subtitle;
  onView?.(snapshot);
}

function render() {
  const route = state.route;
  if (state.error) {
    publish({ kind: "error", message: state.error });
    return;
  }

  if (route.view === "home") {
    const projects = state.data?.projects || [];
    publish({
      kind: "home",
      subtitle: `${projects.length} process/project card(s)`,
      projects,
      groups: groupProjectsByProcess(projects),
    });
    return;
  }

  if (route.view === "project") {
    const projectId = route.projectId;
    const hierarchy = unwrapProjectHierarchy(projectId);
    publish({
      kind: "project",
      subtitle: `Hierarchy · ${projectId}`,
      projectId,
      topName: extractTopName(hierarchy),
      rows: hierarchyRows(hierarchy),
      statusMap: blockStatusMap(projectId),
    });
    return;
  }

  if (route.view === "summary") {
    const projectId = route.projectId;
    const hierarchy = unwrapProjectHierarchy(projectId);
    const blocks = hierarchyRows(hierarchy).map((row) => row.name);
    publish({
      kind: "summary",
      subtitle: `Summary · ${projectId}`,
      projectId,
      rows: collectSummaryRows(projectId, blocks),
    });
    return;
  }

  if (route.view === "block") {
    const { projectId, block, stage } = route;
    const proj = projectMeta(projectId);
    const stats = blockStats(proj.process, proj.project, block);
    const kind = blockBodyKind(stage);
    let body;
    if (kind === "signoff") {
      body = { type: "signoff", signoff: stats.signoff };
    } else if (kind === "tree") {
      body = {
        type: "tree",
        stageLabel: stageLabel(stage),
        tree: buildStageTree(proj.process, proj.project, block, stage),
      };
    } else if (kind === "summary") {
      body = { type: "summary", rows: collectSummaryRows(projectId, [block]), showBlock: false };
    } else if (kind === "pv") {
      body = { type: "pv" };
    } else {
      body = { type: "placeholder", stage };
    }
    publish({
      kind: "block",
      subtitle: `${block} · ${stageLabel(stage)}`,
      projectId,
      block,
      stage,
      meta: stats.meta || {},
      body,
    });
    return;
  }

  if (route.view === "version") {
    const { projectId, block, stage, nodeId } = route;
    const meta = projectMeta(projectId);
    const tree = buildStageTree(meta.process, meta.project, block, stage);
    const node = tree?.nodes?.[nodeId];
    const backHref = `#/project/${encodeURIComponent(projectId)}/block/${encodeURIComponent(block)}/${encodeURIComponent(stage)}`;
    if (!tree || !node) {
      publish({
        kind: "version-missing",
        subtitle: "Version not found",
        stage,
        backHref,
      });
      return;
    }
    publish({
      kind: "version",
      subtitle: `${block} · ${node.stage || stage} · ${node.version || nodeId}`,
      projectId,
      block,
      stage,
      node,
      tree,
      chain: (node.path_to_root || []).map((id) => tree.nodes[id]).filter(Boolean),
      backHref,
    });
  }
}

async function syncRoute() {
  state.route = parseHash();
  state.error = null;
  publish({ kind: "loading" });
  try {
    await loadData();
    if (state.route.view !== "home") {
      const meta = projectMeta(state.route.projectId);
      if (meta) await loadProjectUploads(meta.process, meta.project);
    }
    if (state.route.view === "project" || state.route.view === "summary") {
      await loadHierarchy(state.route.projectId);
    } else if (state.route.view === "block" || state.route.view === "version") {
      await loadHierarchy(state.route.projectId);
      if (state.route.view === "block" && !isAllowedBlockStage(state.route.stage)) {
        go(`/project/${state.route.projectId}/block/${state.route.block}/${DEFAULT_BLOCK_STAGE}`);
        return;
      }
    }
    render();
  } catch (err) {
    state.error = err.message || String(err);
    render();
  }
}

export function mountDashboard({ onView: cb }) {
  onView = cb;
  const onHash = () => {
    syncRoute();
  };
  window.addEventListener("hashchange", onHash);
  syncRoute();
  return () => {
    window.removeEventListener("hashchange", onHash);
    onView = null;
  };
}

function groupProjectsByProcess(projects) {
  const groups = new Map();
  (projects || []).forEach((p) => {
    const key = p.process || "UNKNOWN";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(p);
  });
  return [...groups.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([process, items]) => ({
      process,
      items: items.slice().sort((a, b) => String(a.project).localeCompare(String(b.project))),
    }));
}

function isHierarchyMetaKey(key) {
  return key === "subblocks" || key === "top";
}

function extractTopName(node) {
  if (!node || typeof node !== "object" || Array.isArray(node)) return null;
  const top = node.top;
  return typeof top === "string" && top.trim() ? top.trim() : null;
}

function directChildCount(value) {
  if (!value || typeof value !== "object") return 0;
  const subs = value.subblocks;
  if (Array.isArray(subs)) {
    let n = 0;
    subs.forEach((item) => {
      if (!item || typeof item !== "object") return;
      Object.keys(item).forEach((k) => {
        if (!isHierarchyMetaKey(k)) n += 1;
      });
    });
    return n;
  }
  if (subs && typeof subs === "object") {
    return Object.keys(subs).filter((k) => !isHierarchyMetaKey(k)).length;
  }
  return 0;
}

function hierarchyRows(node, depth = 0, rows = []) {
  if (Array.isArray(node)) {
    node.forEach((item) => hierarchyRows(item, depth, rows));
    return rows;
  }
  if (!node || typeof node !== "object") return rows;

  Object.entries(node).forEach(([key, value]) => {
    if (isHierarchyMetaKey(key)) {
      if (key === "subblocks") hierarchyRows(value, depth, rows);
      return;
    }
    const childCount = directChildCount(value);
    const hasChildren = childCount > 0;
    const isLeaf =
      value === "" ||
      value === null ||
      (typeof value === "object" && !hasChildren && !value.subblocks);
    rows.push({
      name: key,
      depth,
      isLeaf: Boolean(isLeaf || !hasChildren),
      hasChildren: Boolean(hasChildren),
      childCount,
    });
    if (value && typeof value === "object") {
      if (value.subblocks) hierarchyRows(value.subblocks, depth + 1, rows);
      else if (!isLeaf) hierarchyRows(value, depth + 1, rows);
    }
  });
  return rows;
}

function blockStatusMap(projectId) {
  const meta = projectMeta(projectId);
  const map = {};
  (meta?.blocks || []).forEach((blockName) => {
    map[blockName] = blockStats(meta.process, meta.project, blockName);
  });
  return map;
}

export { aprLatestFields, extractMetrics, signoffLatestFields, unwrapMetric };
