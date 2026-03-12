#!/usr/bin/env python3
"""Cross veteran claims with Spiritforged top64 data and build light/premium advisor inputs."""

from __future__ import annotations

import argparse
import json
from collections import Counter
from pathlib import Path

TOPIC_KEYWORDS = {
    'curve': ['curve', 'tempo', 'early'],
    'mulligan': ['mulligan', 'opening hand', 'keep'],
    'matchup': ['matchup', 'mu', 'field', 'meta'],
    'consistency': ['consistency', 'coherence', 'core', 'flex', 'iteration'],
    'data_quality': ['verified', 'sample', 'confidence', 'bracket', 'patch'],
    'pairing': ['legend', 'champion', 'pairing'],
}


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser()
    p.add_argument('--input', default='research/research_base.json')
    p.add_argument('--output', default='research/claims_top64_cross.json')
    return p.parse_args()


def tag_topic(text: str) -> str:
    t = text.lower()
    for tag, kws in TOPIC_KEYWORDS.items():
        if any(k in t for k in kws):
            return tag
    return 'general'


def main() -> int:
    args = parse_args()
    payload = json.loads(Path(args.input).read_text(encoding='utf-8'))
    top64 = payload.get('spiritforged_top64', [])
    claims = payload.get('veteran_discussions', [])

    archetypes = Counter((r.get('archetype') or '').strip() for r in top64 if (r.get('archetype') or '').strip())
    total_top64 = len(top64)

    crossed = []
    for c in claims:
        topic = f"{c.get('topic','')} {c.get('claim','')}"
        tag = tag_topic(topic)
        support = 'low'
        if total_top64 >= 200 and c.get('confidence') == 'high':
            support = 'high'
        elif total_top64 >= 50 and c.get('confidence') in {'high', 'medium'}:
            support = 'medium'

        crossed.append({
            'topic_tag': tag,
            'topic': c.get('topic'),
            'claim': c.get('claim'),
            'confidence': c.get('confidence'),
            'evidence_type': c.get('evidence_type'),
            'support_from_top64': support,
        })

    crossed.sort(key=lambda x: (x['support_from_top64'], x['confidence']), reverse=True)

    out = {
        'meta': {
            'top64_count': total_top64,
            'claims_count': len(claims),
            'top_archetypes': archetypes.most_common(10),
            'note': 'support_from_top64 depends on available verified volume in research_base.',
        },
        'light_advisor': {
            'max_recommendations': 5,
            'eligible_confidence': ['high', 'medium'],
            'recommendations': [c for c in crossed if c['confidence'] in {'high', 'medium'}][:5],
        },
        'premium_advisor': {
            'max_recommendations': 12,
            'eligible_confidence': ['high'],
            'require_support': ['medium', 'high'],
            'recommendations': [
                c for c in crossed
                if c['confidence'] == 'high' and c['support_from_top64'] in {'medium', 'high'}
            ][:12],
        },
        'crossed_claims': crossed,
    }

    out_path = Path(args.output)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'Wrote {out_path}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
