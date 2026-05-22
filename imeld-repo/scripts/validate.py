#!/usr/bin/env python3
"""
Validate an IMELD entry chunk JSON file before merging.

Usage:
  python3 validate.py <chunk.json>
  python3 validate.py <chunk.json> --existing <existing_seed.json>
"""

import argparse
import json
import sys
from collections import Counter
from pathlib import Path

BUCKETS = {
    "Wage & Hour", "Classification", "Leave", "Discrimination & Harassment",
    "Accommodation", "Hiring", "Discipline & Termination",
    "Non-Competes & Restrictive Covenants", "Pay Equity & Transparency",
    "Workplace Safety", "Healthcare-Specific",
    "Recordkeeping & Posting Requirements", "Correctional Medicine"
}

ENTRY_TYPES = {"Case", "Statute", "Regulation", "Guidance", "Form"}

JURISDICTIONS = {"Federal", "Washington", "Idaho", "Montana"}

REQUIRED_FIELDS = {"id", "name", "jurisdiction", "topic", "holding", "application"}


def validate(chunk_path: Path, existing_seed_path: Path = None) -> int:
    errors = []
    warnings = []

    try:
        chunk = json.loads(chunk_path.read_text())
    except json.JSONDecodeError as e:
        print(f"FATAL: chunk is not valid JSON: {e}", file=sys.stderr)
        return 2

    if not isinstance(chunk, list):
        print("FATAL: chunk must be a JSON array", file=sys.stderr)
        return 2

    print(f"Validating {len(chunk)} entries from {chunk_path}")

    # Existing IDs for cross-check
    existing_ids = set()
    if existing_seed_path:
        try:
            existing = json.loads(existing_seed_path.read_text())
            existing_ids = {c['id'] for c in existing}
            print(f"  ({len(existing_ids)} existing entries loaded for ID collision check)")
        except Exception as e:
            warnings.append(f"Could not load existing seed for ID check: {e}")

    # Per-entry checks
    ids_in_chunk = []
    all_related_refs = set()
    for i, entry in enumerate(chunk):
        eid = entry.get('id', f'<entry #{i}>')
        ids_in_chunk.append(eid)

        # Required fields
        for f in REQUIRED_FIELDS:
            if not entry.get(f):
                errors.append(f"{eid}: missing required field '{f}'")

        # Bucket validity
        if 'bucket' in entry and entry['bucket'] not in BUCKETS:
            errors.append(f"{eid}: invalid bucket '{entry['bucket']}'")

        # Entry type validity
        if 'entryType' in entry and entry['entryType'] not in ENTRY_TYPES:
            errors.append(f"{eid}: invalid entryType '{entry['entryType']}'")

        # Jurisdiction validity
        if entry.get('jurisdiction') and entry['jurisdiction'] not in JURISDICTIONS:
            errors.append(f"{eid}: invalid jurisdiction '{entry['jurisdiction']}'")

        # Relevance
        if 'relevance' in entry and entry['relevance'] not in ('high', 'med', 'low'):
            warnings.append(f"{eid}: unusual relevance value '{entry['relevance']}'")

        # ID format check
        if 'id' in entry:
            if ' ' in entry['id']:
                errors.append(f"{eid}: id contains spaces")
            if entry['id'] != entry['id'].lower():
                warnings.append(f"{eid}: id has uppercase characters (convention is lowercase)")

        # Related cases — collect for later check
        for rid in entry.get('relatedCases', []) or []:
            all_related_refs.add(rid)

    # Duplicate IDs within chunk
    id_counts = Counter(ids_in_chunk)
    dups = [k for k, v in id_counts.items() if v > 1]
    if dups:
        errors.append(f"Duplicate IDs within chunk: {dups}")

    # ID collisions with existing seed
    if existing_ids:
        collisions = set(ids_in_chunk) & existing_ids
        if collisions:
            errors.append(f"IDs collide with existing seed: {sorted(collisions)}")

    # Related-case refs that don't exist anywhere yet
    if existing_ids:
        all_known_ids = existing_ids | set(ids_in_chunk)
        dangling = all_related_refs - all_known_ids
        if dangling:
            warnings.append(f"relatedCases references {len(dangling)} unknown IDs: {sorted(dangling)[:5]}{'...' if len(dangling) > 5 else ''}")

    # Distribution stats
    print("\nDistribution within chunk:")
    print(f"  Jurisdictions: {dict(Counter(c.get('jurisdiction', '?') for c in chunk))}")
    print(f"  Buckets:       {dict(Counter(c.get('bucket', '<unassigned>') for c in chunk))}")
    print(f"  Entry types:   {dict(Counter(c.get('entryType', '<unassigned>') for c in chunk))}")

    # Report
    if warnings:
        print(f"\n{len(warnings)} WARNINGS:")
        for w in warnings:
            print(f"  ⚠  {w}")

    if errors:
        print(f"\n{len(errors)} ERRORS:")
        for e in errors:
            print(f"  ✗  {e}")
        return 1

    print(f"\n✓  Validation passed.")
    return 0


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('chunk', type=Path)
    parser.add_argument('--existing', type=Path, default=None)
    args = parser.parse_args()

    sys.exit(validate(args.chunk, args.existing))


if __name__ == '__main__':
    main()
