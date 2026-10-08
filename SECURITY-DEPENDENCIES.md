# Dependency security status

Last checked: 2026-10-08.

## Applied fixes

The package manifests and pnpm lockfiles contain patched versions of Axios,
Undici, shell-quote, sharp, source-map-js, fast-uri, brace-expansion,
markdown-it, js-yaml and webpack-dev-middleware. These updates address 39 of
the 46 Dependabot alerts open at the time of this check. GitHub must rescan
the default branch after these changes are merged before alerts can close.

## Remaining alerts

| Package | Project | Advisory | Status |
| --- | --- | --- | --- |
| braces | Both | GHSA-vfj7-8cjw-p6xm | No patched release reported by the registry audit. |
| http-cache-semantics | Strapi | GHSA-ch52-4w7c-c8xp | No patched release reported by the registry audit. |
| sprintf-js | Strapi | GHSA-hp3w-g68c-fv3c | No patched release reported by the registry audit. |
| elliptic | Strapi | GHSA-848j-6mx2-7j84 | No patched release reported by the registry audit. |
| stream-json | Strapi | GHSA-528h-pc64-c93x, GHSA-hqr4-qq8f-hg3x, GHSA-mjw6-4jj6-33hc | Fixed in 3.6.0, but not a compatible override for Strapi's 1.9.1 dependency. |

Strapi's data-transfer package imports CommonJS modules at
`stream-json/jsonl/Parser` and `stream-json/jsonl/Stringer`. Version 3.6.0 uses
ES modules and a different export layout. Forcing this major upgrade can
break import/export operations even if the admin build succeeds. The latest
Strapi data-transfer release checked (5.52.3) still depends on 1.9.1.
Wait for compatible upstream fixes or perform a separately tested migration;
do not dismiss these alerts as fixed or hide them with audit exclusions.

## Validation

- Next.js production build succeeded.
- All 170 Next.js tests in 47 test files passed.
- Strapi TypeScript compilation and admin production build succeeded.
- Final pnpm audit: Next.js has 1 high alert; Strapi has 2 high, 4 moderate
  and 1 low alerts. No critical alerts remain.

Existing warnings remain: Next.js content fetches fail when Strapi cannot be
reached, and Strapi reports React/React Router peer-version incompatibilities.
These warnings did not fail either build. A successful build is not a complete
runtime security or compatibility assessment.

To recheck, run `pnpm audit`, `pnpm run build` in each project, and
`pnpm exec vitest run` in nextjs-base.