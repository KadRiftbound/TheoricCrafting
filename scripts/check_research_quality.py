#!/usr/bin/env python3
"""Check competitive data quality thresholds for research_base.json."""

from __future__ import annotations

import argparse
import json
from pathlib import Path


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser()
    p.add_argument('--input', default='research/research_base.json')
    p.add_argument('--min-top64', type=int, default=200)
    p.add_argument('--min-claims', type=int, default=50)
    p.add_argument('--max-low-confidence-ratio', type=float, default=0.30)
    p.add_argument('--enforce', action='store_true', default=False)
    return p.parse_args()


def main() -> int:
    args = parse_args()
    path = Path(args.input)
    data = json.loads(path.read_text(encoding='utf-8'))

    top64 = data.get('spiritforged_top64', [])
    claims = data.get('veteran_discussions', [])

    low = sum(1 for c in claims if str(c.get('confidence', '')).strip().lower() == 'low')
    low_ratio = (low / len(claims)) if claims else 1.0

    checks = [
        ('top64_volume', len(top64) >= args.min_top64, f'{len(top64)} / {args.min_top64}'),
        ('claims_volume', len(claims) >= args.min_claims, f'{len(claims)} / {args.min_claims}'),
        ('low_confidence_ratio', low_ratio <= args.max_low_confidence_ratio, f'{low_ratio:.2%} / <= {args.max_low_confidence_ratio:.2%}'),
    ]

    failing = [c for c in checks if not c[1]]

    print('Research quality report:')
    for name, ok, detail in checks:
        print(f"- {name}: {'OK' if ok else 'WARN'} ({detail})")

    if args.enforce and failing:
        return 1
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
