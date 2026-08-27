import { DEFAULT_BLOCK_STAGE, SIGNOFF_STAGE_ID } from "../config";
import { fmt } from "../legacy/format";
import type { AprFields, SignoffFields, SummaryRows } from "../types";
import { ClickableRow, SummaryCell, blockHref, projectHref, versionHref } from "../lib/helpers";

function AprSummaryTable({
  projectId,
  rows,
  showBlock,
}: {
  projectId: string;
  rows: Array<{ block: string; fields: AprFields | null }>;
  showBlock: boolean;
}) {
  const colCount = showBlock ? 13 : 12;

  return (
    <section className="card summary-block">
      <div className="section-head">
        <h3>APR</h3>
        <p className="muted">
          {showBlock ? (
            <>
              Latest run per block (newest <code>upload_date</code>). Click a row for version detail.
            </>
          ) : (
            <>
              Latest APR run for this block (newest <code>upload_date</code>). Click the row for version detail.
            </>
          )}
        </p>
      </div>
      <div className="table-scroll">
        <table className="data leaf-table">
          <thead>
            <tr>
              {showBlock ? <th>Block</th> : null}
              <th>Version</th>
              <th>Stage</th>
              <th>Owner</th>
              <th>Uploaded</th>
              <th>Runtime</th>
              <th>DRC</th>
              <th>Short</th>
              <th>Urate</th>
              <th>WNS</th>
              <th>TNS</th>
              <th>NVP</th>
              <th>Detour vio</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((row) => {
                const f = row.fields;
                if (!f) {
                  return (
                    <tr key={row.block}>
                      {showBlock ? <td className="mono">{row.block}</td> : null}
                      <td colSpan={colCount - (showBlock ? 1 : 0)} className="muted">
                        No APR run yet.
                      </td>
                    </tr>
                  );
                }
                const href = versionHref(projectId, row.block, DEFAULT_BLOCK_STAGE, f.id);
                return (
                  <ClickableRow key={row.block} href={href}>
                    {showBlock ? (
                      <td className="mono">
                        <a href={href}>{row.block}</a>
                      </td>
                    ) : null}
                    <td className="mono">
                      <a href={href}>{fmt(f.version)}</a>
                    </td>
                    <td>{fmt(f.stage)}</td>
                    <td>{fmt(f.owner)}</td>
                    <td className="mono">{fmt(f.upload_date)}</td>
                    <td className="mono">{fmt(f.runtime)}</td>
                    <td>
                      <SummaryCell value={f.drc} />
                    </td>
                    <td>
                      <SummaryCell value={f.drc_short} />
                    </td>
                    <td>
                      <SummaryCell value={f.urate} />
                    </td>
                    <td>
                      <SummaryCell value={f.wns} />
                    </td>
                    <td>
                      <SummaryCell value={f.tns} />
                    </td>
                    <td>
                      <SummaryCell value={f.nvp} />
                    </td>
                    <td>
                      <SummaryCell value={f.detour_vio} />
                    </td>
                  </ClickableRow>
                );
              })
            ) : (
              <tr>
                <td colSpan={colCount} className="empty">
                  No blocks to summarize.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SignoffSummaryTable({
  projectId,
  rows,
  showBlock,
}: {
  projectId: string;
  rows: Array<{ block: string; fields: SignoffFields | null }>;
  showBlock: boolean;
}) {
  const colCount = showBlock ? 9 : 8;

  return (
    <section className="card summary-block">
      <div className="section-head">
        <h3>SignOff</h3>
        <p className="muted">
          {showBlock ? (
            <>
              Latest <code>stage_qa</code> run per block. Click a row for the full checklist.
            </>
          ) : (
            <>Latest SignOff run for this block. Click the row for the full checklist.</>
          )}
        </p>
      </div>
      <div className="table-scroll">
        <table className="data leaf-table">
          <thead>
            <tr>
              {showBlock ? <th>Block</th> : null}
              <th>Version</th>
              <th>QA stage</th>
              <th>Track</th>
              <th>Date</th>
              <th>Status</th>
              <th>Pass</th>
              <th>Fail</th>
              <th>Warn</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((row) => {
                const f = row.fields;
                const href = blockHref(projectId, row.block, SIGNOFF_STAGE_ID);
                if (!f) {
                  return (
                    <tr key={row.block}>
                      {showBlock ? <td className="mono">{row.block}</td> : null}
                      <td colSpan={colCount - (showBlock ? 1 : 0)} className="muted">
                        No SignOff run yet.
                      </td>
                    </tr>
                  );
                }
                return (
                  <ClickableRow key={row.block} href={href}>
                    {showBlock ? (
                      <td className="mono">
                        <a href={href}>{row.block}</a>
                      </td>
                    ) : null}
                    <td className="mono">
                      <a href={href}>{fmt(f.version)}</a>
                    </td>
                    <td>{fmt(f.qa_stage)}</td>
                    <td>{fmt(f.track)}</td>
                    <td className="mono">{fmt(f.upload_date)}</td>
                    <td>
                      <SummaryCell value={f.qa_status} asBadge />
                    </td>
                    <td className="mono">
                      {fmt(f.pass_num)}/{fmt(f.item_num)}
                    </td>
                    <td className="mono">{fmt(f.fail_num)}</td>
                    <td className="mono">{fmt(f.warn_num)}</td>
                  </ClickableRow>
                );
              })
            ) : (
              <tr>
                <td colSpan={colCount} className="empty">
                  No blocks to summarize.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function SummarySections({
  projectId,
  rows,
  showBlock,
}: {
  projectId: string;
  rows: SummaryRows;
  showBlock: boolean;
}) {
  return (
    <>
      <AprSummaryTable projectId={projectId} rows={rows.apr} showBlock={showBlock} />
      <SignoffSummaryTable projectId={projectId} rows={rows.signoff} showBlock={showBlock} />
    </>
  );
}

export function ProjectSummaryView({ projectId, rows }: { projectId: string; rows: SummaryRows }) {
  return (
    <>
      <div className="block-head">
        <div>
          <h2>Latest run summary</h2>
          <p className="muted">{projectId} · one table per category (APR, SignOff). PV comes later.</p>
        </div>
        <a className="btn" href={projectHref(projectId)}>
          ← Hierarchy
        </a>
      </div>
      <SummarySections projectId={projectId} rows={rows} showBlock />
    </>
  );
}
