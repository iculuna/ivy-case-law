# IMELD Buckets and Entry Types

## The 13 Buckets

IMELD groups entries into 13 substantive buckets. Every entry must be assigned to exactly one.

1. **Wage & Hour** — minimum wage, overtime, travel pay, on-call, rest/meal breaks, wage payment, wage claims, garnishment
2. **Classification** — exempt/non-exempt, employee vs. contractor
3. **Leave** — sick, family, medical, PTO, jury, military, bereavement, organ donation, domestic violence
4. **Discrimination & Harassment** — Title VII, WLAD, IHRA, MHRA, NLRA Section 7, retaliation, confidentiality (Silenced No More), arbitration in discrimination context, labor relations (folded in per user decision)
5. **Accommodation** — ADA, pregnancy (PWFA), religious (Groff), lactation
6. **Hiring** — background checks, ban-the-box, pay transparency, I-9, driver's license restrictions, drug testing, FCRA
7. **Discipline & Termination** — at-will exceptions, final pay timing, severance, WDEA, written discharge statements, mini-WARN, unemployment claims
8. **Non-Competes & Restrictive Covenants** — noncompetes, nonsolicits, confidentiality outside Silenced No More context
9. **Pay Equity & Transparency** — EPOA, equal pay, pay transparency in postings
10. **Workplace Safety** — OSHA, WISHA, state OSHA equivalents, workplace violence prevention, workers' comp
11. **Healthcare-Specific** — nurse staffing ratios, mandatory overtime restrictions for healthcare, licensing scope (general healthcare; correctional-specific items go in #13)
12. **Recordkeeping & Posting Requirements** — personnel records access, required posters, wage statements, recordkeeping periods
13. **Correctional Medicine** — jail standards, PREA, §1983 / Estelle / Farmer, HIPAA correctional carve-outs, mandatory reporting in correctional context, background checks specific to jail workers, licensing scope for correctional clinicians

### User-driven bucket decisions (locked in)

- **Wage Claims** go under Wage & Hour (NOT Discipline & Termination)
- **Labor Relations** (NLRA, RTW, union issues) folded into Discrimination & Harassment (no separate Labor Relations bucket)
- **Correctional Medicine** is the 13th bucket — distinct from Healthcare-Specific

## The 5 Entry Types

1. **Case** — judicial opinion (any court)
2. **Statute** — legislative enactment (state code, federal U.S.C.)
3. **Regulation** — agency regulation (CFR, WAC, IDAPA, ARM)
4. **Guidance** — agency policy, opinion letter, administrative bulletin (non-binding but persuasive)
5. **Form** — required notice, poster, wage statement, leave form, agency form

## Topic → Bucket mapping

Use this lookup when assigning new entries to buckets:

| Topic (free text) | Bucket |
|---|---|
| Travel Pay, Meal Breaks, Mandatory Overtime, Overtime, Hours Worked, Minimum Wage, Wage Claims, Wage Payment | Wage & Hour |
| Classification / Exemptions | Classification |
| Leave | Leave |
| Discrimination, Union / Labor Relations, Confidentiality, Arbitration / Class Actions, Retaliation | Discrimination & Harassment |
| Religious Accommodation, Pregnancy Accommodation, Accommodation | Accommodation |
| Termination, Discipline | Discipline & Termination |
| Unemployment (when separation-driven) | Discipline & Termination |
| Hiring | Hiring |
| Noncompete | Non-Competes & Restrictive Covenants |
| Pay Equity | Pay Equity & Transparency |
| Workplace Safety, Workers' Compensation | Workplace Safety |
| Staffing Ratios (general healthcare) | Healthcare-Specific |
| Recordkeeping | Recordkeeping & Posting Requirements |
| Correctional-specific items (PREA, §1983, jail standards, HIPAA correctional) | Correctional Medicine |

## Entry Type heuristic

When the entry type isn't obvious from context, apply this:

1. If `court` contains "Legislature" or "Congress" → **Statute**
2. If `court` contains "Dept.", "Department", or "L&I" AND `cite` contains "CFR" or "WAC" or "IDAPA" or "ARM" → **Regulation**
3. If `court` is an agency AND `cite` contains "Policy" / "Bulletin" / "Opinion" → **Guidance**
4. If `cite` says "No state statute" or "No prohibition" → **Statute** (absence-of-law entry)
5. If `name` matches "Required {form/poster/notice}" or `cite` is an agency form number → **Form**
6. Otherwise → **Case**

## Override list

Some entries don't follow the heuristic cleanly. Maintain these overrides in `scripts/migrate_and_merge.py`:

```python
ENTRY_TYPE_OVERRIDES = {
    "wa-hls-a2": "Guidance",
    "flsa-778-318": "Regulation",
    "flsa-778-115": "Regulation",
    "flsa-nurse-exemptions": "Regulation",
    "idaho-no-break-law": "Statute",
    "montana-no-break-law": "Statute",
    "idaho-mandatory-ot-allowed": "Statute",
    "montana-mandatory-ot-allowed": "Statute",
    "wa-seattle-local-min-wage": "Statute",
    "wa-abc-test-independent-contractor": "Statute",
    "idaho-osha-state": "Regulation",
}
```

Add new overrides here when an entry's heuristic-assigned type is wrong.
