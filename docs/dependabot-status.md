# Dependabot status

_Last updated: 2026-10-27. Starter template extracted from `pulsewatch-mobile`; update when the state changes._

## Configuration

- Ecosystems covered: npm (`/`), github-actions (`/`).
- Grouping: minor and patch updates grouped as `minor-and-patch`.
- Schedule: weekly.
- Ignore rules: `expo` and `expo-*` majors (SDK upgrades are deliberate); `react`, `react-native`, `@types/react` and `@react-native/*` majors and minors (pinned by the Expo SDK); `typescript`, `eslint` and `@types/node` majors.

## State at last update

- Open Dependabot PRs: 0 (each merged or closed only after reading its checks).
- Default-branch CI: green at last check.
- Repository settings (read live 2026-10-10): public, `is_template` true, description set, default branch `main` (the only branch kept), secret scanning, push protection and Dependabot security updates enabled, dependency graph on (SBOM endpoint 200). Non-provider secret patterns and validity checks stay off: GitHub does not offer them on this user-owned public repo.
- Set by the repo owner through the API on 2026-10-10 (the session's proxy blocks repository-settings writes) and read back by the session the same day: private vulnerability reporting enabled (PUT 204), `delete_branch_on_merge` on (PATCH 200), repository topics set (PUT 200). Fork-PR workflow approval is `all_external_contributors` (read with the owner's token). Stale branches left over from squash-merged PRs were deleted after a fresh diff against `main` showed their content already on `main`.
- Alerts read 2026-10-10 with the repo owner's token: Dependabot #2 `node-forge` (GHSA-86w9-cpqp-85rv, high) and #3 `braces` (GHSA-vfj7-8cjw-p6xm, high) match the `scripts/check-npm-audit.mjs` allowlist (Expo build tooling, no patched release). #4 `sprintf-js` (GHSA-hp3w-g68c-fv3c, medium) is dev-only with no patched release (npm audit `--omit=dev` does not see it). #1 `decode-uri-component` (medium, fix 0.5.0) is in the app bundle through `expo-router` 57 -> `query-string` 7, but 0.5.0 is ESM-only and breaks `query-string` 7, so it clears only with the SDK 58 upgrade (see the closed PR #1 under Notes). All four were dismissed as `tolerable_risk` with a comment by the repo owner on 2026-10-10 (PATCH 200), as in pulsewatch-mobile. No code-scanning or secret-scanning alerts. The read-back after the dismissals showed 0 open Dependabot and 0 open code-scanning alerts.
- Rescan 2026-10-11 repeated every dimension (open PRs, branches, CI on `main`, required contexts against the last merged PR's check runs, protection, `security_and_analysis`, private vulnerability reporting, dependency graph, `is_template`, description, topics, licence placeholders) and added one: whether the GitHub description actually describes this repo. Live result: no open PRs, `main` the only branch, CI on `main` green, every required context produced green by the last merged PR, protection unchanged, secret scanning, push protection and Dependabot security updates enabled, private vulnerability reporting on, SBOM 200, `is_template` true, description accurate, topics set, `LICENSE` filled in (2026, arb-rajab). The repo owner's token read 0 open Dependabot, code-scanning and secret-scanning alerts and fork-PR approval `all_external_contributors`. No new gaps.
- Rescan 2026-10-27 (a new loop after a gap in which Dependabot opened a fresh batch of PRs). Merged (squash) after reading each PR's check runs: #5, #7, #10. Merged from this session: #9 (hold jest-expo and eslint-config-expo majors with the Expo SDK). Closed unmerged, each with a comment where the session closed it: #6 (jest-expo 58 needs the SDK 58 react-native; every Jest suite fails on SDK 57). The `Dependabot` check run on main shows a failed security-update job for `zod` (nested 3.25.76 copy under @expo/cli, GHSA-mrhx-c7xc-m3w5, no 3.x fix): expected, covered by the allowlist in `scripts/check-npm-audit.mjs`. Live result when this entry was written: main CI green, branch protection and required contexts unchanged and each context produced by the last merged PR's check runs, private vulnerability reporting on, dependency graph on (SBOM 200). Dependabot, code-scanning and secret-scanning alerts and the repository security settings are read with the owner's token, not by the session; their state is recorded after the owner's next read.

## Time-limited exemptions

- the allowlist in `scripts/check-npm-audit.mjs`, every entry expiring 2026-11-09 (earlier than the source repos' 2026-11-15): `node-forge` GHSA-86w9-cpqp-85rv; `braces` GHSA-vfj7-8cjw-p6xm (both via Expo build tooling, never in the app bundle). After that date the scan fails until each entry is renewed or removed. The scan is not a required check, so merges still work, but re-check each advisory for a fix before then.

## Notes

- Merge policy (deliberate choice by the repo owner, the same blanket policy as the application repos): every PR, major-version dependency bumps included, is squash-merged as soon as all of its required checks are green, confirmed per PR. This repo is a code showcase with no business or sensitive dependency, so green checks are the only gate. Red, pending or conflicted PRs are fixed or closed instead.
- `main` protection (2026-10-10, read back): pull request required (0 approvals), enforced for admins, force pushes and deletions blocked, "require branches to be up to date" off (`strict` false) on purpose. Nobody pushes to `main` directly; status-log updates go through a PR too.
- Required contexts: `App (typecheck, lint, tests)`, `Secret scanning (gitleaks)`. Nothing else is required on purpose: osv-scanner, npm audit, dependency review and CodeQL depend on a moving advisory database or run only on some events.
- Closed unmerged on 2026-10-10, each with an explanatory comment: #1 (2026-10-10, a Dependabot security update for `decode-uri-component` that moved `expo-router` to 58 against SDK 57; the bundle step failed, as on pulsewatch-mobile #27). If Dependabot recreates one, apply the merge policy; the closure is not re-raised. Dependabot does not re-propose a major after its PR is closed, so a later upgrade is a manual change.
- `decode-uri-component` 0.2.2 reaches the app via `expo-router` 57 -> `query-string` 7. Its fix (0.5.0) is ESM-only, so an override breaks query parsing; it clears with a deliberate SDK 58 upgrade.
- `jest-expo` and `eslint-config-expo` majors are held with the Expo SDK in `.github/dependabot.yml`: jest-expo 58 needs the SDK 58 react-native and fails every Jest suite on SDK 57. The `eslint-config-expo` 58 bump (#5) merged before that rule existed; lint, typecheck and tests were green. Revisit at the next SDK upgrade.

## Deferred (not re-raised each pass)

- Alert reads (Dependabot, code scanning, secret scanning) and Actions settings (fork-PR approval) are blocked for Claude sessions by the proxy; they are read and written with the repo owner's token on their own machine.
- The owner keeps the token's Administration, Contents and Secret scanning permissions and does not rotate it (deliberate, 2026-10-09, reconfirmed 2026-10-10 for the template repos).
- Re-check the exemptions above before 2026-11-09 and drop each once its upstream fix ships.
- Dependabot commands (`@dependabot rebase`, `@dependabot recreate`) written by a Claude session are neutralised when the comment is posted (the mention is mangled, so Dependabot never sees it). Rebases and recreates of conflicted or stale PRs go through the owner's token; the session can only refresh a branch with the update-branch call or replace the PR with its own.
