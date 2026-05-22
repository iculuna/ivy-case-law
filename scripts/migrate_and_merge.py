#!/usr/bin/env python3
"""
Merge new IMELD entries into the existing seed, applying schema migration.

Usage:
  python3 migrate_and_merge.py \
    --existing seed_current.json \
    --new chunk1.json [--new chunk2.json ...] \
    --output seed_merged.json
"""

import argparse
import json
import sys
from collections import Counter
from pathlib import Path

# Bucket mapping for new entries — see references/buckets-and-types.md
TOPIC_TO_BUCKET = {
    # Wage & Hour
    "Travel Pay": "Wage & Hour",
    "Meal Breaks": "Wage & Hour",
    "Mandatory Overtime": "Wage & Hour",
    "Overtime": "Wage & Hour",
    "Hours Worked": "Wage & Hour",
    "Minimum Wage": "Wage & Hour",
    "Wage Claims": "Wage & Hour",
    "Wage Payment": "Wage & Hour",
    # Classification
    "Classification / Exemptions": "Classification",
    # Leave
    "Leave": "Leave",
    # Discrimination & Harassment (incl. Labor Relations per user)
    "Discrimination": "Discrimination & Harassment",
    "Union / Labor Relations": "Discrimination & Harassment",
    "Confidentiality": "Discrimination & Harassment",
    "Arbitration / Class Actions": "Discrimination & Harassment",
    "Retaliation": "Discrimination & Harassment",
    # Accommodation
    "Religious Accommodation": "Accommodation",
    "Pregnancy Accommodation": "Accommodation",
    "Accommodation": "Accommodation",
    # Discipline & Termination
    "Termination": "Discipline & Termination",
    "Discipline": "Discipline & Termination",
    "Unemployment": "Discipline & Termination",
    # Non-Competes
    "Noncompete": "Non-Competes & Restrictive Covenants",
    # Pay Equity
    "Pay Equity": "Pay Equity & Transparency",
    # Workplace Safety
    "Workplace Safety": "Workplace Safety",
    "Workers' Compensation": "Workplace Safety",
    # Healthcare-Specific
    "Staffing Ratios": "Healthcare-Specific",
    # Hiring
    "Hiring": "Hiring",
    # Recordkeeping
    "Recordkeeping": "Recordkeeping & Posting Requirements",
    # Correctional Medicine (Pass 1B)
    "Jail Standards": "Correctional Medicine",
    "PREA": "Correctional Medicine",
    "Section 1983": "Correctional Medicine",
    "Correctional HIPAA": "Correctional Medicine",
    "Correctional Licensing": "Correctional Medicine",
    "Correctional Reporting": "Correctional Medicine",
}

# Per-entry entryType overrides
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


def assign_entry_type(case):
    if case['id'] in ENTRY_TYPE_OVERRIDES:
        return ENTRY_TYPE_OVERRIDES[case['id']]
    court = (case.get('court') or '').lower()
    cite = (case.get('cite') or '').lower()
    if 'legislature' in court or 'congress' in court:
        return 'Statute'
    if 'dept.' in court or 'department' in court or 'l&i' in court:
        if any(x in cite for x in ('cfr', 'wac', 'idapa', 'arm')):
            return 'Regulation'
        return 'Guidance'
    if 'no state statute' in cite or 'no prohibition' in cite:
        return 'Statute'
    return 'Case'


def migrate(case, default_review='May 2026'):
    """Add v2+ schema fields if missing. Does NOT overwrite existing values."""
    out = dict(case)
    if 'bucket' not in out:
        out['bucket'] = TOPIC_TO_BUCKET.get(case.get('topic', ''), 'Wage & Hour')
    if 'entryType' not in out:
        out['entryType'] = assign_entry_type(case)
    out.setdefault('favorite', False)
    out.setdefault('lastReviewed', default_review)
    return out


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--existing', type=Path, required=True, help='Existing seed JSON file')
    parser.add_argument('--new', type=Path, action='append', required=True, help='New entry chunk JSON file (can repeat)')
    parser.add_argument('--output', type=Path, required=True, help='Output merged seed JSON')
    parser.add_argument('--review-date', default='May 2026', help='Default lastReviewed date for new entries')
    args = parser.parse_args()

    # Load existing
    existing = json.loads(args.existing.read_text())
    print(f"Existing seed: {len(existing)} entries")

    # Load all new chunks
    new_entries = []
    for chunk_path in args.new:
        chunk = json.loads(chunk_path.read_text())
        new_entries.extend(chunk)
        print(f"  + {chunk_path.name}: {len(chunk)} entries")

    # Apply migration to new entries
    new_migrated = [migrate(c, default_review=args.review_date) for c in new_entries]

    # Combine
    combined = existing + new_migrated

    # Duplicate ID check
    id_counts = Counter(c['id'] for c in combined)
    dups = [k for k, v in id_counts.items() if v > 1]
    if dups:
        print(f"\n✗  FATAL: duplicate IDs across combined seed: {dups}", file=sys.stderr)
        sys.exit(1)

    # Distribution
    print(f"\nMerged total: {len(combined)} entries")
    print("\nJurisdiction:")
    for j, n in Counter(c['jurisdiction'] for c in combined).most_common():
        print(f"  {n:>3}  {j}")
    print("\nBucket:")
    for b, n in Counter(c['bucket'] for c in combined).most_common():
        print(f"  {n:>3}  {b}")
    print("\nEntry type:")
    for t, n in Counter(c['entryType'] for c in combined).most_common():
        print(f"  {n:>3}  {t}")

    # Write
    args.output.write_text(json.dumps(combined, indent=2))
    print(f"\n✓  Wrote {args.output}")


if __name__ == '__main__':
    main()
