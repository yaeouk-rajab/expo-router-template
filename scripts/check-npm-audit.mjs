#!/usr/bin/env node
/**
 * Runs `npm audit --omit=dev --audit-level=high` but lets a small, explicitly dated
 * allowlist of advisory IDs pass instead of failing the build. Entries are
 * added only with an owner-approved expiry date. An entry past its `expires` date makes this script fail until a human renews
 * or removes it.
 *
 * Usage: node scripts/check-npm-audit.mjs
 * Exit 0: no high/critical leaf advisories, or every one is allowlisted and unexpired.
 * Exit 1: a non-allowlisted high/critical advisory, or an expired allowlist entry.
 */

import { execFileSync } from "node:child_process";

/** @type {{ id: string, package: string, expires: string, reason: string }[]} */
// Empty by default. Add an entry only for a finding that is real, dev/build-tooling
// only (never shipped in the app bundle) and has no upstream fix yet. Every entry
// needs an `expires` date (YYYY-MM-DD) so it is re-reviewed, e.g.:
//   { id: "GHSA-xxxx-xxxx-xxxx", package: "pkg", expires: "2027-01-01", reason: "..." }
const ALLOWLIST = [
  {
    id: "GHSA-mrhx-c7xc-m3w5",
    package: "zod",
    expires: "2026-11-07",
    reason:
      "Zod memory exhaustion on oversized constrained collections (high). " +
      "The flagged copy is zod 3.25.76 nested under @expo/cli " +
      "(node_modules/@expo/cli/node_modules/zod), which Expo's own CLI uses " +
      "for build/dev tooling, so it is never part of the app bundle. The " +
      "app's own lint tooling resolves a separate zod 4.x; this 3.x copy " +
      "cannot be fixed: no 3.x release carries a fix (3.25.76 is the " +
      "latest) and npm audit only offers a downgrade of expo. Re-check " +
      "before the expiry date: drop this entry once @expo/cli moves to a " +
      "patched zod, otherwise re-confirm and renew.",
  },
  {
    id: "GHSA-86w9-cpqp-85rv",
    package: "node-forge",
    expires: "2026-11-09",
    reason:
      "RSA PKCS#1 v1.5 signature-verification bypass. Reached only via Expo's own build tooling (@expo/cli -> @expo/code-signing-certificates); never part of the app bundle. No patched release as of 2026-10-10. Re-check for a fix before the expiry date, then delete or renew.",
  },
  {
    id: "GHSA-vfj7-8cjw-p6xm",
    package: "braces",
    expires: "2026-11-09",
    reason:
      "Stack-exhaustion DoS in braces <= 3.0.3. Reached only via Metro/micromatch and Expo build tooling; never shipped in the app bundle. No patched release as of 2026-10-10. Re-check for a fix before the expiry date, then delete or renew.",
  },
];

function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}

function runAudit() {
  try {
    const out = execFileSync(
      "npm",
      ["audit", "--omit=dev", "--audit-level=high", "--json"],
      { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
    );
    return JSON.parse(out);
  } catch (err) {
    // npm audit exits non-zero when it finds anything at/above
    // --audit-level, but still writes the JSON report to stdout.
    if (err.stdout) {
      try {
        return JSON.parse(err.stdout);
      } catch (parseErr) {
        console.error("Could not parse npm audit JSON output:");
        console.error(err.stdout);
        throw parseErr;
      }
    }
    throw err;
  }
}

// `npm audit --json` propagates severity up the WHOLE dependency chain: if
// leaf package D has a real advisory, every package that depends on it
// (C -> B -> A) also gets its own top-level entry in `vulnerabilities`, and
// that entry's `severity` field is the MAX severity of every advisory
// reachable anywhere below it — not necessarily the severity of any single
// advisory. C/B/A's own `via` arrays list the next package DOWN the chain as
// a plain package-name *string*, not the advisory object; only the actual
// leaf advisory entries are objects with a `url` AND THEIR OWN `severity`.
//
// So: walk the WHOLE report and collect every leaf advisory object (the ones
// with their own `url` + `severity`), deduped by url. Only a leaf whose OWN
// severity is high/critical needs an allowlist entry — a moderate leaf
// dragged into a "high" container by an unrelated sibling advisory does not.
function collectLeafAdvisories(vulnerabilitiesByName) {
  const leavesByUrl = new Map();
  for (const vuln of Object.values(vulnerabilitiesByName)) {
    for (const via of vuln.via ?? []) {
      if (via && typeof via === "object" && typeof via.url === "string") {
        leavesByUrl.set(via.url, via);
      }
    }
  }
  return leavesByUrl;
}

// For reporting purposes only: which top-level package name(s) a given leaf
// advisory url is reachable from, so console/annotation output can still say
// "pkg (via parent -> ...)" rather than just a bare URL.
function topLevelNamesReaching(url, vulnerabilitiesByName) {
  const names = [];
  for (const vuln of Object.values(vulnerabilitiesByName)) {
    const stack = [...(vuln.via ?? [])];
    const seen = new Set();
    while (stack.length > 0) {
      const via = stack.pop();
      if (via && typeof via === "object" && via.url === url) {
        names.push(vuln.name);
        break;
      }
      if (typeof via === "string" && !seen.has(via)) {
        seen.add(via);
        const next = vulnerabilitiesByName[via];
        if (next) {
          stack.push(...(next.via ?? []));
        }
      }
    }
  }
  return names;
}

function main() {
  const today = todayUtc();
  const expired = ALLOWLIST.filter((entry) => entry.expires < today);
  if (expired.length > 0) {
    console.error(
      "npm-audit allowlist has expired entries that must be re-reviewed " +
        "before this check can pass:",
    );
    for (const entry of expired) {
      console.error(`  - ${entry.id} (${entry.package}), expired ${entry.expires}`);
    }
    console.error(
      "\nRe-run `npm audit --omit=dev --audit-level=high` for real and " +
        "either renew the expiry date in scripts/check-npm-audit.mjs (if " +
        "still unfixed upstream) or remove the entry (if a fix shipped).",
    );
    process.exit(1);
  }

  const report = runAudit();
  const vulnerabilitiesByName = report.vulnerabilities ?? {};

  // Evaluate each LEAF advisory's own severity, never the rolled-up
  // container severity npm audit stamps on parent packages, so a
  // moderate finding dragged into a "high" container by an unrelated
  // sibling advisory isn't mistaken for
  // something that needs its own allowlist entry.
  const leafAdvisoriesByUrl = collectLeafAdvisories(vulnerabilitiesByName);
  const highOrCriticalLeaves = [...leafAdvisoriesByUrl.values()].filter(
    (a) => a.severity === "high" || a.severity === "critical",
  );

  if (highOrCriticalLeaves.length === 0) {
    console.log("npm audit: no high/critical findings. Clean.");
    process.exit(0);
  }

  const allowedIds = [...new Set(ALLOWLIST.map((e) => e.id))];
  const unexplained = [];
  const explained = [];

  for (const advisory of highOrCriticalLeaves) {
    const matchedId = allowedIds.find((id) => advisory.url.includes(id));
    const names = topLevelNamesReaching(advisory.url, vulnerabilitiesByName);
    const entry = {
      title: advisory.title ?? advisory.name,
      severity: advisory.severity,
      url: advisory.url,
      via: names.join(", ") || "(unknown path)",
    };
    if (matchedId) {
      explained.push(entry);
    } else {
      unexplained.push(entry);
    }
  }

  if (unexplained.length > 0) {
    const summary = unexplained
      .map((u) => `${u.title} (${u.severity}) via ${u.via}: ${u.url}`)
      .join(" | ");
    // Also as a GitHub Actions error annotation, so it's visible via the
    // check-run annotations API even when the raw job log isn't reachable.
    console.log(
      `::error title=npm audit - unexplained findings::${summary}`,
    );
    console.error(
      "npm audit found high/critical advisories NOT covered by the " +
        "allowlist in scripts/check-npm-audit.mjs:",
    );
    for (const u of unexplained) {
      console.error(`  - ${u.title} (${u.severity}) via ${u.via}: ${u.url}`);
    }
    process.exit(1);
  }

  console.log(
    `npm audit: ${highOrCriticalLeaves.length} high/critical advisory(ies), ` +
      "all covered by the dated allowlist (see scripts/check-npm-audit.mjs):",
  );
  for (const e of explained) {
    console.log(`  - ${e.title} (${e.severity}) via ${e.via}`);
  }
  process.exit(0);
}

try {
  main();
} catch (err) {
  console.log(`::error title=npm audit script crashed::${err?.message ?? err}`);
  console.error(err);
  process.exit(1);
}
