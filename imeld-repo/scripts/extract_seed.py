#!/usr/bin/env python3
"""
Extract the SEED_CASES array from an IMELD HTML file.

Usage:
  python3 extract_seed.py <input.html> <output.json>
"""

import json
import re
import sys
from pathlib import Path


def extract_seed(html_path: Path) -> list:
    html = html_path.read_text()

    # Find SEED_CASES start
    start = html.find('const SEED_CASES =')
    if start < 0:
        raise SystemExit("Could not locate 'const SEED_CASES =' in HTML")

    # Find where SEED_CASES ends (just before 'let cases =')
    let_pos = html.find('let cases =', start)
    if let_pos < 0:
        raise SystemExit("Could not locate 'let cases =' after SEED_CASES — HTML structure may have changed")

    section = html[start:let_pos]

    # Extract the JSON array
    m = re.search(r'const SEED_CASES = (\[.*?\n\]);', section, re.DOTALL)
    if not m:
        raise SystemExit("Could not parse SEED_CASES literal — regex did not match")

    try:
        return json.loads(m.group(1))
    except json.JSONDecodeError as e:
        raise SystemExit(f"SEED_CASES is not valid JSON: {e}")


def main():
    if len(sys.argv) != 3:
        print("Usage: extract_seed.py <input.html> <output.json>", file=sys.stderr)
        sys.exit(2)

    input_path = Path(sys.argv[1])
    output_path = Path(sys.argv[2])

    if not input_path.exists():
        raise SystemExit(f"Input file not found: {input_path}")

    seed = extract_seed(input_path)
    output_path.write_text(json.dumps(seed, indent=2))

    print(f"Extracted {len(seed)} entries to {output_path}")

    # Quick stats
    from collections import Counter
    jur = Counter(c.get('jurisdiction', 'Unknown') for c in seed)
    print("Jurisdiction:", dict(jur))


if __name__ == '__main__':
    main()
