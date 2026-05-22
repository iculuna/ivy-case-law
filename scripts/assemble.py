#!/usr/bin/env python3
"""
Assemble an IMELD HTML by combining template + CSS + JS + seed JSON.

Outputs ONE HTML for one view mode at a time. Use --view to pick:
  --view compliance   includes Correctional Medicine bucket (default)
  --view hr           hides Correctional Medicine bucket for HR users

Usage:
  python3 assemble.py --seed seed.json --output index.html [--view hr|compliance]

Templates are bundled in scripts/templates/ next to this script.
"""

import argparse
import json
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
TEMPLATES_DIR = SCRIPT_DIR / 'templates'

VIEW_CONFIGS = {
    'hr': {
        'banner_label': '👥 HR View — employment law for hiring, terminations, and HR decisions',
        'banner_class': 'view-hr',
        'body_class': 'hr-view',
        'other_view_link': 'compliance.html',
        'other_view_text': 'Switch to Compliance View (includes correctional medicine) →',
    },
    'compliance': {
        'banner_label': '⚖️ Compliance View — full database including correctional medicine',
        'banner_class': 'view-compliance',
        'body_class': 'compliance-view',
        'other_view_link': 'index.html',
        'other_view_text': 'Switch to HR View →',
    },
}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--seed', type=Path, required=True, help='Merged seed JSON')
    parser.add_argument('--output', type=Path, required=True, help='Output HTML path')
    parser.add_argument('--view', choices=['hr', 'compliance'], default='compliance',
                        help='View mode (default: compliance)')
    parser.add_argument('--templates', type=Path, default=TEMPLATES_DIR, help='Override templates directory')
    parser.add_argument('--last-reviewed', default=None,
                        help='Last-reviewed date for footer (default: current month and year)')
    args = parser.parse_args()

    cfg = VIEW_CONFIGS[args.view]

    # Default last-reviewed to current month and year
    if args.last_reviewed:
        last_reviewed = args.last_reviewed
    else:
        from datetime import datetime
        last_reviewed = datetime.now().strftime('%B %Y')

    # Load pieces
    css = (args.templates / 'styles.css').read_text()
    js = (args.templates / 'app.js').read_text()
    template = (args.templates / 'template.html').read_text()
    seed = json.loads(args.seed.read_text())

    print(f"View: {args.view}")
    print(f"Last reviewed: {last_reviewed}")
    print(f"Templates: {args.templates}")
    print(f"  CSS:      {len(css):,} bytes")
    print(f"  JS:       {len(js):,} bytes")
    print(f"  Template: {len(template):,} bytes")
    print(f"  Seed:     {len(seed)} entries")

    # Build SEED_CASES literal
    seed_literal = 'const SEED_CASES = ' + json.dumps(seed, indent=2) + ';'

    # Inject the view-mode flag at the very top of the JS so it's set before
    # any module-level code runs.
    view_setter = f'window.IMELD_VIEW_MODE = "{args.view}";\n'

    # Inject into JS
    placeholder = '// __SEED_CASES_PLACEHOLDER__'
    if placeholder not in js:
        print(f"FATAL: JS template missing placeholder '{placeholder}'", file=sys.stderr)
        sys.exit(1)
    js_filled = js.replace(placeholder, view_setter + seed_literal)

    # Compose HTML — fill view-mode template fields
    html = (
        template
        .replace('__CSS_PLACEHOLDER__', css)
        .replace('__JS_PLACEHOLDER__', js_filled)
        .replace('__VIEW_BANNER_CLASS__', cfg['banner_class'])
        .replace('__VIEW_BANNER_LABEL__', cfg['banner_label'])
        .replace('__VIEW_MODE_CLASS__', cfg['body_class'])
        .replace('__OTHER_VIEW_LINK__', cfg['other_view_link'])
        .replace('__OTHER_VIEW_TEXT__', cfg['other_view_text'])
        .replace('__LAST_REVIEWED__', last_reviewed)
    )

    # Sanity check
    placeholders_to_check = [
        '__CSS_PLACEHOLDER__', '__JS_PLACEHOLDER__', placeholder,
        '__VIEW_BANNER_CLASS__', '__VIEW_BANNER_LABEL__',
        '__VIEW_MODE_CLASS__',
        '__OTHER_VIEW_LINK__', '__OTHER_VIEW_TEXT__',
        '__LAST_REVIEWED__',
    ]
    for p in placeholders_to_check:
        if p in html:
            print(f"FATAL: placeholder '{p}' still present in output", file=sys.stderr)
            sys.exit(1)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(html)

    print(f"\nWrote {args.output}")
    print(f"   Size: {len(html):,} bytes")


if __name__ == '__main__':
    main()
