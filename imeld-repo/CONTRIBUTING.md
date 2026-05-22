# Contributing to IMELD

IMELD is centrally maintained by Isaac. The team is welcome to flag issues, suggest entries, and submit small fixes.

## I found a typo or wrong citation

**Open a pull request.** Edit `data/entries.json` directly, fix the issue, push. The GitHub Action will rebuild and redeploy automatically when the PR is merged.

For something fast — typo, broken link, citation that's off by a digit — direct PRs are welcome.

## I found a missing statute, case, regulation, or guidance document I think should be in IMELD

**Open an issue.** Use the issue template. Include:

- The citation (statute section, case name and reporter cite, regulation section, etc.)
- A one-sentence description of why it should be in IMELD
- Which Ivy operations or HR decisions it affects
- A link to the official source if you have one

Isaac will review, draft the entry, and merge.

## I disagree with an entry's "Ivy Medical application" content

**Open an issue.** Describe what you think the application should say differently. The application field is the most opinionated part of each entry — getting team input on these is useful.

## I want to update an entry because the law changed

**Open an issue with the legislative session info or court decision.** Statutes change every year, and IMELD gets stale without active maintenance. Helpful info:

- Which entry is affected (use the entry ID, e.g., `wa-rcw-49-12-240-personnel-records`)
- The change (new bill number, new case, new regulation)
- Effective date
- Brief description of what changed

## Entry schema

See `docs/schema.md` for the full entry schema. Every entry needs at minimum:

- `id` — kebab-case, jurisdiction-prefixed (e.g., `wa-rcw-49-48-010-wage-payment`)
- `name` — display name
- `jurisdiction` — Federal / Washington / Idaho / Montana
- `bucket` — one of 13 substantive buckets
- `entryType` — Case / Statute / Regulation / Guidance / Form
- `holding` — 2-4 sentence plain-English summary
- `application` — operational implications for Ivy
- `dos` and `donts` — 3-5 each

## Building locally

Before submitting a PR:

```bash
python3 scripts/build.py
```

The build will validate the JSON, regenerate `index.html`, and run smoke tests. If anything fails, fix it before pushing.

## Style guide for entries

- Plain English. No legalese unless quoting the operative statutory language briefly (under 15 words).
- "Ivy Medical application" should be operational — what does HR or a manager DO with this information?
- Do's and Don'ts should be action items, not aspirations.
- Cross-reference related entries by ID in `relatedCases`.
- For numerical facts (rates, thresholds, penalties), include the effective year and source.
- Don't fabricate citations. If you're unsure of a section number, say so and ask Isaac to verify.
