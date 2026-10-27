@AGENTS.md

# Notes for Claude Code sessions on this repo

- Expo SDK 58. Read the versioned docs (see `AGENTS.md`) before writing code; APIs differ from older SDKs.
- `npm install` / `npm ci` need `--legacy-peer-deps` (expo-router optional peers conflict under npm's default
  resolver). A plain `npm install` ERESOLVE error is this known shape, not a real break.
- If `registry.npmjs.org` returns 403 in a sandbox, confirm with
  `curl -sS -o /dev/null -w '%{http_code}\n' https://registry.npmjs.org/` and push-and-watch CI instead of
  looping on installs.
- `npm audit --omit=dev` reports Expo build-tooling findings with no non-breaking fix; `npm audit fix --force`
  downgrades Expo and is a regression. CI uses `scripts/check-npm-audit.mjs` (`--audit-level=high`, dated
  allowlist). Do not widen the allowlist without the repo owner's sign-off; entries must expire.
- Jest: RNTL 14 `render()` is async, so always `await render(...)`. The default `testTimeout` is 10000 because
  component tests flake on busy CI runners; if timeouts recur, add `--runInBand` to the `test` script.
- Mocking `expo-device` flags: a plain object mock is value-copied by Babel's interop; use a getter/setter
  descriptor (see `lib/__tests__/device-tokens.test.ts`).
- Push delivery and cold-start notification taps can only be verified on a physical device with real
  credentials. Never commit FCM/APNs credentials.
- Keep `@types/node` on the same major as the Node version in `.github/workflows/ci.yml`.
- CI also runs `npx expo export` for both platforms: it catches SDK mismatches that typecheck, lint and Jest miss.
- Durable project context goes in `docs/project-memory/`.
