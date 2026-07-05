#!/usr/bin/env node
// Soft-hide (reversible) old issues from the Paperclip interface.
//
// It hides every issue whose status is `done` or `cancelled` (configurable)
// by setting `hiddenAt`. Hidden issues drop out of every default list view but
// keep all their data — un-hide by PATCHing `{ "hiddenAt": null }`.
//
// DRY-RUN BY DEFAULT: without --apply it only prints what it *would* hide.
//
// Usage:
//   PAPERCLIP_API_URL=http://localhost:3100 \
//   PAPERCLIP_API_KEY=<board-or-agent-token> \
//   PAPERCLIP_COMPANY_ID=<company-id> \
//   node scripts/cleanup-old-issues.mjs            # dry-run
//   node scripts/cleanup-old-issues.mjs --apply    # actually hide
//
// Options:
//   --apply                 Perform the hide (otherwise dry-run).
//   --statuses=done,cancelled   Which statuses to target (default: done,cancelled).
//   --older-than-days=30    Only hide issues not updated in the last N days (optional).

const API_URL = (process.env.PAPERCLIP_API_URL || "http://localhost:3100").replace(/\/$/, "");
const API_KEY = process.env.PAPERCLIP_API_KEY || "";
let COMPANY_ID = process.env.PAPERCLIP_COMPANY_ID || "";

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const statusesArg = args.find((a) => a.startsWith("--statuses="));
const olderArg = args.find((a) => a.startsWith("--older-than-days="));
const STATUSES = (statusesArg ? statusesArg.split("=")[1] : "done,cancelled")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const OLDER_THAN_DAYS = olderArg ? Number.parseInt(olderArg.split("=")[1], 10) : null;

const headers = {
  "Content-Type": "application/json",
  // In local_trusted mode the server treats every request as an implicit board,
  // so no token is needed. Provide PAPERCLIP_API_KEY for remote/authenticated use.
  ...(API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {}),
};

async function resolveCompanyId() {
  if (COMPANY_ID) return;
  const res = await fetch(`${API_URL}/api/companies`, { headers });
  if (!res.ok) throw new Error(`list companies failed ${res.status}: ${await res.text()}`);
  const body = await res.json();
  const companies = Array.isArray(body) ? body : (body.companies ?? body.items ?? []);
  if (companies.length === 0) throw new Error("no companies found on this instance");
  if (companies.length > 1) {
    console.error("Multiple companies found — set PAPERCLIP_COMPANY_ID to one of:");
    for (const c of companies) console.error(`  ${c.id}  ${c.name ?? ""}`);
    process.exit(1);
  }
  COMPANY_ID = companies[0].id;
  console.log(`Using company: ${companies[0].name ?? COMPANY_ID} (${COMPANY_ID})`);
}

const cutoff =
  OLDER_THAN_DAYS != null ? Date.now() - OLDER_THAN_DAYS * 24 * 60 * 60 * 1000 : null;

async function listBatch(offset, limit) {
  const url = `${API_URL}/api/companies/${encodeURIComponent(COMPANY_ID)}/issues?status=${encodeURIComponent(
    STATUSES.join(","),
  )}&limit=${limit}&offset=${offset}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`list failed ${res.status}: ${await res.text()}`);
  const body = await res.json();
  return Array.isArray(body) ? body : (body.issues ?? body.items ?? []);
}

async function hide(issue) {
  const res = await fetch(`${API_URL}/api/issues/${encodeURIComponent(issue.id)}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ hiddenAt: new Date().toISOString() }),
  });
  if (!res.ok) throw new Error(`hide ${issue.id} failed ${res.status}: ${await res.text()}`);
}

function isOldEnough(issue) {
  if (cutoff == null) return true;
  const ts = issue.updatedAt ? Date.parse(issue.updatedAt) : null;
  return ts == null || ts < cutoff;
}

async function main() {
  await resolveCompanyId();
  const limit = 100;
  let offset = 0;
  const targets = [];
  for (;;) {
    const batch = await listBatch(offset, limit);
    if (batch.length === 0) break;
    for (const issue of batch) {
      if (issue.hiddenAt) continue; // already hidden
      if (!STATUSES.includes(issue.status)) continue;
      if (!isOldEnough(issue)) continue;
      targets.push(issue);
    }
    if (batch.length < limit) break;
    offset += limit;
  }

  console.log(
    `Found ${targets.length} issue(s) matching status [${STATUSES.join(", ")}]` +
      (OLDER_THAN_DAYS != null ? ` older than ${OLDER_THAN_DAYS}d` : ""),
  );
  for (const t of targets) {
    console.log(`  ${t.identifier ?? t.id}  [${t.status}]  ${t.title ?? ""}`);
  }

  if (!APPLY) {
    console.log("\nDRY-RUN. Re-run with --apply to hide these issues.");
    return;
  }

  let ok = 0;
  let failed = 0;
  for (const t of targets) {
    try {
      await hide(t);
      ok += 1;
    } catch (err) {
      failed += 1;
      console.error(`  FAILED ${t.identifier ?? t.id}: ${err.message}`);
    }
  }
  console.log(`\nHidden ${ok} issue(s), ${failed} failure(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
