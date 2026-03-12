#!/usr/bin/env python3
import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'data' / 'sources'
OUT = ROOT / 'research' / 'research_base.json'

REQUIRED_DECK_FIELDS = {
    'tournament_name', 'tournament_tier', 'date', 'patch', 'placement', 'player',
    'archetype', 'legend', 'chosen_champion', 'decklist_source_url',
    'vod_or_bracket_url', 'verification_status', 'notes', 'source_site'
}

REQUIRED_DISC_FIELDS = {
    'source_type', 'source_name', 'url', 'author', 'date', 'topic',
    'claim', 'evidence_type', 'confidence', 'notes'
}


def read_csv(path):
    with path.open(newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        return list(reader), set(reader.fieldnames or [])


def main():
    deck_file = DATA / 'spiritforged_top64_template.csv'
    disc_file = DATA / 'veteran_discussions_template.csv'

    decks, deck_fields = read_csv(deck_file)
    discussions, disc_fields = read_csv(disc_file)

    missing_deck = REQUIRED_DECK_FIELDS - deck_fields
    missing_disc = REQUIRED_DISC_FIELDS - disc_fields
    if missing_deck or missing_disc:
        raise SystemExit(
            f'Missing columns. deck={sorted(missing_deck)} discussions={sorted(missing_disc)}'
        )

    top64 = []
    for row in decks:
        if row.get('patch') != 'Spiritforged':
            continue
        placement = row.get('placement', '').strip()
        if placement.isdigit() and 1 <= int(placement) <= 64:
            top64.append(row)

    out = {
        'meta': {
            'generated_from': [str(deck_file.relative_to(ROOT)), str(disc_file.relative_to(ROOT))],
            'spiritforged_top64_count': len(top64),
            'discussion_count': len(discussions),
            'note': 'verification_status and confidence must be reviewed manually before production use.'
        },
        'spiritforged_top64': top64,
        'veteran_discussions': discussions,
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, indent=2, ensure_ascii=False), encoding='utf-8')
    print(f'Wrote {OUT.relative_to(ROOT)}')


if __name__ == '__main__':
    main()
