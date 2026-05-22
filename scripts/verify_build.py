#!/usr/bin/env python3
"""
Verify a built IMELD HTML file.

Usage:
  python3 verify_build.py <built.html>
"""

import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path


def main():
    if len(sys.argv) != 2:
        print("Usage: verify_build.py <built.html>", file=sys.stderr)
        sys.exit(2)

    path = Path(sys.argv[1])
    if not path.exists():
        raise SystemExit(f"File not found: {path}")

    html = path.read_text()
    print(f"Verifying {path}")
    print(f"  Size: {len(html):,} bytes")

    failures = 0

    # 1. Placeholders all replaced
    for p in ('__CSS_PLACEHOLDER__', '__JS_PLACEHOLDER__', '__SEED_CASES_PLACEHOLDER__'):
        if p in html:
            print(f"  ✗  Placeholder still present: {p}")
            failures += 1
    if failures == 0:
        print("  ✓  All placeholders replaced")

    # 2. SEED_CASES parseable
    start = html.find('const SEED_CASES =')
    let_pos = html.find('let cases =', start)
    if start < 0 or let_pos < 0:
        print("  ✗  Could not locate SEED_CASES boundaries")
        failures += 1
    else:
        section = html[start:let_pos]
        m = re.search(r'const SEED_CASES = (\[.*?\n\]);', section, re.DOTALL)
        if not m:
            print("  ✗  Could not extract SEED_CASES literal")
            failures += 1
        else:
            try:
                parsed = json.loads(m.group(1))
                print(f"  ✓  SEED_CASES parses: {len(parsed)} entries")
            except json.JSONDecodeError as e:
                print(f"  ✗  SEED_CASES JSON invalid: {e}")
                failures += 1

    # 3. JS syntax check (if node available)
    start = html.find('<script>') + len('<script>')
    end = html.find('</script>', start)
    if start > 0 and end > start:
        js = html[start:end]
        with tempfile.NamedTemporaryFile('w', suffix='.js', delete=False) as f:
            f.write(js)
            tmp_path = f.name
        try:
            result = subprocess.run(
                ['node', '--check', tmp_path],
                capture_output=True, text=True, timeout=10
            )
            if result.returncode == 0:
                print("  ✓  JS syntax valid (node --check)")
            else:
                print(f"  ✗  JS syntax invalid:\n{result.stderr}")
                failures += 1
        except FileNotFoundError:
            print("  ⚠  node not available — skipping JS syntax check")
        except subprocess.TimeoutExpired:
            print("  ⚠  node --check timed out — skipping")
        finally:
            Path(tmp_path).unlink(missing_ok=True)

    # 4. Critical markers (view-aware)
    # Detect view from the injected view-mode setter
    is_hr_view = 'IMELD_VIEW_MODE = "hr"' in html
    is_compliance_view = 'IMELD_VIEW_MODE = "compliance"' in html

    critical = [
        ('header title', 'Ivy Medical Employment Law Database (IMELD)'),
        ('storage key', "STORAGE_KEY = 'ivy_cases'"),
        ('search input', 'id="search-input"'),
        ('detail page', 'class="detail-page"'),
        ('comparison page', 'class="comparison-page"'),
        ('multi-select jurisdictions', 'id="filter-jurisdictions-pills"'),
        ('multi-select buckets', 'id="filter-buckets-pills"'),
    ]
    if is_hr_view:
        critical.append(('HR view marker', 'IMELD_VIEW_MODE = "hr"'))
        critical.append(('HR banner class', 'view-hr'))
    elif is_compliance_view:
        critical.append(('Compliance view marker', 'IMELD_VIEW_MODE = "compliance"'))
        critical.append(('Compliance banner class', 'view-compliance'))
        critical.append(('Correctional Medicine bucket reference', '"Correctional Medicine"'))
    else:
        print("  ✗  No view-mode marker found in HTML (expected 'IMELD_VIEW_MODE = ...')")
        failures += 1

    for label, needle in critical:
        if needle in html:
            print(f"  ✓  {label}")
        else:
            print(f"  ✗  Missing: {label} ('{needle}')")
            failures += 1

    if failures:
        print(f"\n✗  {failures} verification failure(s)")
        sys.exit(1)
    print("\n✓  Build verified.")


if __name__ == '__main__':
    main()
