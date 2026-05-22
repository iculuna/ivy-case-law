#!/usr/bin/env python3
"""
Build IMELD from data/entries.json to two HTML files:
  - index.html        (HR view, hides Correctional Medicine bucket)
  - compliance.html   (Full view, includes everything)

Both files load from the same data/entries.json.

Usage:
  python3 scripts/build.py
"""

import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).parent.parent
ENTRIES = REPO_ROOT / 'data' / 'entries.json'
INDEX = REPO_ROOT / 'index.html'
COMPLIANCE = REPO_ROOT / 'compliance.html'
SCRIPTS = REPO_ROOT / 'scripts'


def run(label, cmd):
    print(f"\n=== {label} ===")
    result = subprocess.run(cmd, capture_output=False)
    if result.returncode != 0:
        print(f"\n{label} FAILED with exit code {result.returncode}", file=sys.stderr)
        sys.exit(result.returncode)


def main():
    if not ENTRIES.exists():
        print(f"{ENTRIES} not found", file=sys.stderr)
        sys.exit(1)

    # 1. Validate once
    run("Validate entries.json", [
        sys.executable, str(SCRIPTS / 'validate.py'), str(ENTRIES)
    ])

    # 2. Build HR view (index.html)
    run("Assemble HR view (index.html)", [
        sys.executable, str(SCRIPTS / 'assemble.py'),
        '--seed', str(ENTRIES),
        '--output', str(INDEX),
        '--view', 'hr'
    ])

    # 3. Build Compliance view (compliance.html)
    run("Assemble Compliance view (compliance.html)", [
        sys.executable, str(SCRIPTS / 'assemble.py'),
        '--seed', str(ENTRIES),
        '--output', str(COMPLIANCE),
        '--view', 'compliance'
    ])

    # 4. Verify both
    run("Verify HR view", [
        sys.executable, str(SCRIPTS / 'verify_build.py'), str(INDEX)
    ])
    run("Verify Compliance view", [
        sys.executable, str(SCRIPTS / 'verify_build.py'), str(COMPLIANCE)
    ])

    print(f"\nBuild complete:")
    print(f"   {INDEX}      (HR view)")
    print(f"   {COMPLIANCE} (Compliance view)")


if __name__ == '__main__':
    main()
