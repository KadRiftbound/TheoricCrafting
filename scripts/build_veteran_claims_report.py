#!/usr/bin/env python3
import csv
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / 'data' / 'sources' / 'veteran_discussions_template.csv'
OUT = ROOT / 'research' / 'reports' / 'veteran-claims-report.md'


def main():
    with SRC.open(newline='', encoding='utf-8') as f:
        rows = list(csv.DictReader(f))

    by_conf = Counter(r.get('confidence', 'unknown') for r in rows)
    by_evidence = Counter(r.get('evidence_type', 'unknown') for r in rows)

    high_medium = [r for r in rows if r.get('confidence') in {'high', 'medium'}]

    lines = [
        '# Veteran Claims Report',
        '',
        f'- Total claims: **{len(rows)}**',
        f"- High confidence: **{by_conf.get('high', 0)}**",
        f"- Medium confidence: **{by_conf.get('medium', 0)}**",
        f"- Low confidence: **{by_conf.get('low', 0)}**",
        '',
        '## Evidence type distribution',
    ]

    for k, v in by_evidence.items():
        lines.append(f'- {k}: {v}')

    lines.extend(['', '## Priority claims (high/medium)'])
    for r in high_medium:
        lines.append(
            f"- [{r.get('confidence')}] {r.get('topic')}: {r.get('claim')} ({r.get('source_name')})"
        )

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text('\n'.join(lines) + '\n', encoding='utf-8')
    print(f'Wrote {OUT.relative_to(ROOT)}')


if __name__ == '__main__':
    main()
