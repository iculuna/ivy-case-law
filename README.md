# IMELD — Ivy Medical Employment Law Database

A working reference for employment law affecting Ivy Medical's operations as a correctional medical contractor in Idaho, Montana, and Washington.

## Two views, one database

IMELD has two landing pages for two different user groups:

**HR View** — [`index.html`](./index.html) — for the HR team handling hires, terminations, leave, accommodation, pay, and other day-to-day HR work. Covers all 12 employment-law buckets across Federal, WA, ID, and MT. The Correctional Medicine bucket is hidden in this view because it's not relevant to HR's work.

**Compliance View** — [`compliance.html`](./compliance.html) — for Isaac and anyone working on compliance, contract risk, or research into new states. Includes everything in the HR view PLUS the Correctional Medicine bucket (PREA, § 1983, HIPAA correctional carve-out, jail standards, etc.).

Both views read from the same `data/entries.json`. Changes in the data file automatically appear in both views.

**Live URLs** (update after GitHub Pages is set up):
- HR view: `https://[YOUR-USERNAME].github.io/imeld/`
- Compliance view: `https://[YOUR-USERNAME].github.io/imeld/compliance.html`

A toggle link at the top of each view lets users switch between them.

## Multi-select filtering

Both views support selecting multiple jurisdictions AND multiple buckets at once. Useful for cross-cutting workflows:

- **Termination workflow:** select Wage & Hour, Discipline & Termination, Leave, and Discrimination & Harassment together to see everything that affects a termination decision.
- **New hire workflow:** select Hiring, Classification, Pay Equity, and Recordkeeping together.
- **Multi-state research:** select WA + ID + MT to compare an issue across all three states.

Click a pill to add it. Click again to remove. Click "Clear all filters" to start over.

## Current coverage (145 entries)

| Jurisdiction | Entries |
|---|---|
| Washington | 48 |
| Idaho | 35 |
| Federal | 32 |
| Montana | 30 |

| Entry type | Count |
|---|---|
| Statute | 104 |
| Case | 23 |
| Regulation | 13 |
| Guidance | 5 |

| Bucket | HR view | Compliance view |
|---|---|---|
| Wage & Hour | ✓ | ✓ |
| Discrimination & Harassment | ✓ | ✓ |
| Leave | ✓ | ✓ |
| Discipline & Termination | ✓ | ✓ |
| Workplace Safety | ✓ | ✓ |
| Hiring | ✓ | ✓ |
| Classification | ✓ | ✓ |
| Recordkeeping & Posting Requirements | ✓ | ✓ |
| Non-Competes & Restrictive Covenants | ✓ | ✓ |
| Accommodation | ✓ | ✓ |
| Pay Equity & Transparency | ✓ | ✓ |
| Healthcare-Specific | ✓ | ✓ |
| Correctional Medicine | — | ✓ (30 entries) |

## Personal preferences (favorites, etc.)

Each user's favorites and notes are saved in their browser's localStorage. They don't sync across devices or teammates. Each view (HR and Compliance) shares the same localStorage, so a favorite set in one view appears in the other.

## How the build works

Both HTML files are generated from `data/entries.json`. To rebuild after editing entries:

```bash
python3 scripts/build.py
```

That regenerates BOTH `index.html` and `compliance.html` with the current entries. The build is also automatic via GitHub Actions — push to `main` and the live site updates.

### Build scripts reference

- `scripts/build.py` — One-shot build (validate + assemble both views + verify both)
- `scripts/validate.py` — Sanity-check `data/entries.json` without rebuilding
- `scripts/assemble.py` — Build ONE view (`--view hr` or `--view compliance`)
- `scripts/verify_build.py` — Smoke-test a built HTML file
- `scripts/extract_seed.py` — Pull entries out of an existing HTML file (rarely needed)
- `scripts/migrate_and_merge.py` — Combine multiple entry chunks for batch additions

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). The short version: open an issue describing the missing or incorrect entry, and Isaac will draft and merge. Direct PRs welcome from team members for typos and citation fixes.

## Disclaimer

This is an internal reference for Ivy Medical. It is not legal advice. Statutes and case law change; entries may be stale. Verify current law for any decision with real consequences. When the database disagrees with a lawyer, the lawyer wins.

## License

Internal use only. See [LICENSE](./LICENSE).
