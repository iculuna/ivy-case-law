# IMELD Entry Schema

Every IMELD entry is a JSON object with the following fields.

## Required fields

| Field | Type | Description |
|---|---|---|
| `id` | string | Unique, URL-safe identifier (kebab-case). Pattern examples: `wa-rcw-49-48-010-wage-payment`, `idaho-44-1502-min-wage`, `mt-wrongful-discharge`, `sacks-2021`. Use the jurisdiction prefix + section number + short topic. |
| `name` | string | Display name of the case/statute/reg. Cases: italicized format like "Smith v. Jones". Statutes: include both code section and short title, e.g., "WA Personnel Records Access (RCW 49.12.240)". |
| `year` | number | Year of enactment/decision/last amendment. |
| `cite` | string | Full legal citation. Cases: "598 U.S. 39". Statutes: "RCW 49.12.480". Regs: "29 CFR 778.318". Multiple sections: "RCW 49.46.020, .070". |
| `jurisdiction` | string | One of: `"Federal"`, `"Washington"`, `"Idaho"`, `"Montana"`. |
| `court` | string | Issuing body. Cases: full court name. Statutes: "WA Legislature" / "Idaho Legislature" / "Montana Legislature" / "U.S. Congress". Regs: agency name. |
| `topic` | string | Free-text sub-category. Common values: Travel Pay, Meal Breaks, Mandatory Overtime, Overtime, Hours Worked, Wage Payment, Wage Claims, Minimum Wage, Classification / Exemptions, Leave, Discrimination, Retaliation, Religious Accommodation, Pregnancy Accommodation, Accommodation, Termination, Noncompete, Pay Equity, Workplace Safety, Staffing Ratios, Workers' Compensation, Unemployment, Hiring, Recordkeeping, Confidentiality, Discipline, Union / Labor Relations, Arbitration / Class Actions. |
| `bucket` | string | One of the 13 IMELD buckets (see `buckets-and-types.md`). |
| `entryType` | string | One of: `"Case"`, `"Statute"`, `"Regulation"`, `"Guidance"`, `"Form"`. |
| `relevance` | string | One of: `"high"` (cornerstone), `"med"` (important), `"low"` (reference). |
| `quirky` | boolean | True if this is a state-specific quirk that surprises people who default to federal-law thinking. |
| `holding` | string | The rule in 2-4 plain-English sentences. For statutes/regs, this is the "summary." |
| `application` | string | **The most important field.** How this affects Ivy Medical's specific operational situation. Be concrete, action-oriented, and specific to Ivy as a correctional medical contractor with W-2 clinicians in county jails. |
| `dos` | array of strings | 3-5 action-oriented "Do" items. Each should be operational and verifiable. |
| `donts` | array of strings | 3-5 action-oriented "Don't" items. Common failure modes, things that look fine but aren't. |
| `relatedCases` | array of strings | IDs of related IMELD entries. Use existing entry IDs only — don't invent. |
| `lastReviewed` | string | When the entry was last verified, e.g., "May 2026". Default to current month/year. |
| `favorite` | boolean | Default `false`. User-toggleable star. |

## Optional fields

| Field | Type | Description |
|---|---|---|
| `facts` | string | For cases: the factual background. For statutes/regs: the operative provisions (which becomes "Operative Provisions" in the UI). Skip for Forms. |
| `reasoning` | string | For cases: court's reasoning. For statutes/regs: legislative intent / context (becomes "Legislative Intent / Background" in the UI). |
| `source_url` | string | Official URL to the code/case/agency page. Useful but not required. |

## Schema example — Statute

```json
{
  "id": "wa-rcw-49-48-010-wage-payment",
  "name": "WA Wage Payment Act (RCW 49.48.010)",
  "year": 2010,
  "cite": "RCW 49.48.010",
  "jurisdiction": "Washington",
  "court": "WA Legislature",
  "topic": "Wage Payment",
  "bucket": "Wage & Hour",
  "entryType": "Statute",
  "relevance": "high",
  "quirky": false,
  "favorite": false,
  "lastReviewed": "May 2026",
  "holding": "WA employers must pay all wages owed upon termination by the end of the pay period. Unpaid wages willfully withheld trigger doubling under RCW 49.52.070.",
  "facts": "RCW 49.48.010 is the operative final-paycheck statute. The end-of-pay-period standard is more lenient than MT's immediate-pay-on-firing rule.",
  "reasoning": "The legislature gave employers reasonable processing time but coupled it with strong deterrence against using final pay as leverage.",
  "application": "For Ivy Medical's WA correctional medical staff: pay all wages by end of pay period at termination. Include accrued vacation if policy provides payout. Don't withhold over disputed equipment returns or training repayment without specific written authorization. Pay undisputed portion immediately if any portion is disputed.",
  "dos": [
    "Pay all undisputed wages by end of pay period at termination",
    "Include accrued vacation if policy provides payout",
    "Get specific written authorization for any deduction"
  ],
  "donts": [
    "Don't withhold final pay to enforce equipment return",
    "Don't deduct training costs without prior signed authorization",
    "Don't withhold to force release signing"
  ],
  "relatedCases": ["wa-final-paycheck-rcw-49-48", "wa-rcw-49-52-willful-withholding"]
}
```

## Schema example — Case

```json
{
  "id": "muldrow-2024",
  "name": "Muldrow v. City of St. Louis",
  "year": 2024,
  "cite": "601 U.S. 346",
  "jurisdiction": "Federal",
  "court": "U.S. Supreme Court",
  "topic": "Discrimination",
  "bucket": "Discrimination & Harassment",
  "entryType": "Case",
  "relevance": "high",
  "quirky": true,
  "favorite": false,
  "lastReviewed": "May 2026",
  "holding": "A Title VII discrimination plaintiff need only show 'some harm' from a job transfer or reassignment — not 'significant' or 'material' harm.",
  "facts": "Sgt. Jatonya Muldrow was transferred from plainclothes intelligence to uniformed patrol. Pay didn't change, but schedule, prestige, and responsibilities did.",
  "reasoning": "Justice Kagan held that Title VII's text prohibits discrimination with respect to terms, conditions, or privileges of employment — without requiring heightened harm.",
  "application": "For Ivy Medical: lateral transfers, schedule changes, role reassignments can now form the basis of a discrimination claim more easily. Document non-discriminatory reasons for ALL role changes affecting protected-class employees.",
  "dos": ["Document a clean rationale for every reassignment", "Treat schedule changes with the same care as terminations"],
  "donts": ["Don't assume pay-neutral changes are immune", "Don't skip documentation for lateral moves"],
  "relatedCases": ["bostock-2020", "groff-2023"]
}
```

## ID naming conventions

- WA statutes: `wa-rcw-{section}-{topic}` (e.g., `wa-rcw-49-48-010-wage-payment`)
- WA bills: `wa-{bill-number}-{topic}-{year}` (e.g., `wa-hb-1308-personnel-2025`)
- Idaho statutes: `idaho-{section}-{topic}` (e.g., `idaho-45-606-wage-payment`)
- Montana statutes: `mt-{section}-{topic}` (e.g., `mt-39-3-201-wage-payment`)
- Federal CFR: `flsa-{section}` or `cfr-{section}` (e.g., `flsa-778-318`)
- Federal cases: `{casename}-{year}` (e.g., `bostock-2020`, `sacks-2021`)
- State cases: `{casename}-{year}` (e.g., `androckitis-2024`, `wright-home-depot-2008`)

## UI field mapping

The IMELD JavaScript adapts field labels based on `entryType`:

| Field | Case | Statute / Regulation / Guidance |
|---|---|---|
| `holding` | "Holding" | "Summary" |
| `facts` | "Facts" | "Operative Provisions" |
| `reasoning` | "Reasoning" | "Legislative Intent / Background" |

`application` is always labeled "Application — Ivy Medical Practice."
