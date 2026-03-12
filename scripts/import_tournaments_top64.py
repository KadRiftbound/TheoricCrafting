#!/usr/bin/env python3
"""Normalize tournament exports into Spiritforged Top64 dataset.

Supports source presets for:
- riftdecks
- topdeck
- piltoverarchive
- riftboundgg

Usage:
  python scripts/import_tournaments_top64.py \
    --source topdeck \
    --input data/raw/topdeck_tournaments.csv \
    --output data/processed/spiritforged_top64_normalized.csv \
    --patch Spiritforged \
    --top-cut 64 \
    --require-major
"""

from __future__ import annotations

import argparse
import csv
from collections import Counter
from pathlib import Path

BASE_ALIASES = {
    'tournament_name': ['tournament_name', 'tournament', 'event', 'event_name'],
    'tournament_tier': ['tournament_tier', 'tier', 'event_tier'],
    'date': ['date', 'event_date'],
    'patch': ['patch', 'set', 'format_patch', 'version'],
    'placement': ['placement', 'rank', 'position', 'standing'],
    'player': ['player', 'pilot', 'player_name'],
    'archetype': ['archetype', 'deck_archetype', 'deck_type'],
    'legend': ['legend', 'legend_name'],
    'chosen_champion': ['chosen_champion', 'champion', 'chosen champ'],
    'decklist_source_url': ['decklist_source_url', 'deck_url', 'decklist', 'list_url'],
    'vod_or_bracket_url': ['vod_or_bracket_url', 'bracket_url', 'vod_url', 'event_url'],
}

SOURCE_EXTRA_ALIASES = {
    'riftdecks': {
        'patch': ['expansion'],
    },
    'topdeck': {
        'tournament_name': ['tournament title', 'event title'],
        'tournament_tier': ['category'],
        'date': ['start_date', 'tournament_date'],
        'patch': ['format', 'season'],
        'placement': ['final_rank', 'finish'],
        'player': ['username', 'player_tag'],
        'archetype': ['archetype_name'],
        'legend': ['legend_card'],
        'chosen_champion': ['champion_card', 'chosen_champion_name'],
        'decklist_source_url': ['decklist_url'],
        'vod_or_bracket_url': ['tournament_url'],
    },
    'piltoverarchive': {
        'tournament_name': ['event_title'],
        'tournament_tier': ['event_level'],
        'date': ['played_at'],
        'patch': ['set_name', 'expansion'],
        'placement': ['placing'],
        'player': ['competitor'],
        'archetype': ['lineup_archetype'],
        'legend': ['legend_unit'],
        'chosen_champion': ['champion_unit'],
        'decklist_source_url': ['deck_url', 'lineup_url'],
        'vod_or_bracket_url': ['bracket', 'event_link'],
    },
    'riftboundgg': {
        'tournament_name': ['name'],
        'tournament_tier': ['level'],
        'date': ['published_at'],
        'patch': ['format_name', 'release'],
        'placement': ['place'],
        'player': ['author', 'player_handle'],
        'archetype': ['archetype_label'],
        'legend': ['legend_label'],
        'chosen_champion': ['champion_label'],
        'decklist_source_url': ['deck_page_url'],
        'vod_or_bracket_url': ['tournament_page_url'],
    },
}

OUTPUT_FIELDS = [
    'tournament_name', 'tournament_tier', 'date', 'patch', 'placement', 'player',
    'archetype', 'legend', 'chosen_champion', 'decklist_source_url',
    'vod_or_bracket_url', 'verification_status', 'notes', 'source_site'
]


def normalize_header(header: str) -> str:
    return str(header or '').strip().lower().replace('-', '_')


def build_aliases(source: str) -> dict[str, list[str]]:
    aliases = {k: list(v) for k, v in BASE_ALIASES.items()}
    extras = SOURCE_EXTRA_ALIASES.get(source, {})
    for key, values in extras.items():
        seen = set(aliases[key])
        for item in values:
            if item not in seen:
                aliases[key].append(item)
    return aliases


def pick(row: dict[str, str], aliases: dict[str, list[str]], logical_key: str) -> str:
    for alias in aliases[logical_key]:
        v = row.get(alias)
        if v is not None and str(v).strip():
            return str(v).strip()
    return ''


def load_rows(path: Path) -> list[dict[str, str]]:
    with path.open(newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        rows = []
        for raw in reader:
            row = {normalize_header(k): (v or '').strip() for k, v in raw.items()}
            rows.append(row)
    return rows


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument('--source', required=True, choices=sorted(SOURCE_EXTRA_ALIASES.keys()))
    parser.add_argument('--input', required=True)
    parser.add_argument('--output', required=True)
    parser.add_argument('--patch', default='Spiritforged')
    parser.add_argument('--top-cut', type=int, default=64)
    parser.add_argument('--require-major', action='store_true', default=False)
    parser.add_argument('--report', default='research/reports/spiritforged-top64-import.md')
    return parser.parse_args()


def placement_in_cut(value: str, top_cut: int) -> bool:
    if not value or not value.isdigit():
        return False
    p = int(value)
    return 1 <= p <= top_cut


def is_major_tier(value: str) -> bool:
    v = normalize_header(value)
    return v in {'major', 'championship', 'regional', 'open_major', 's_tier', 'major_event'}


def summarize(rows: list[dict[str, str]]) -> dict[str, object]:
    by_archetype = Counter(r['archetype'] for r in rows if r['archetype'])
    by_legend = Counter(r['legend'] for r in rows if r['legend'])
    by_tournament = Counter(r['tournament_name'] for r in rows if r['tournament_name'])

    return {
        'rows': len(rows),
        'unique_tournaments': len(by_tournament),
        'top_archetypes': by_archetype.most_common(10),
        'top_legends': by_legend.most_common(10),
    }


def write_csv(path: Path, rows: list[dict[str, str]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=OUTPUT_FIELDS)
        w.writeheader()
        for row in rows:
            w.writerow(row)


def write_markdown_report(path: Path, summary: dict[str, object], rows: list[dict[str, str]], source: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tournaments = sorted({r['tournament_name'] for r in rows if r['tournament_name']})

    lines = [
        '# Spiritforged Top64 Import Report',
        '',
        f'- Source preset: **{source}**',
        f"- Rows kept: **{summary['rows']}**",
        f"- Unique tournaments: **{summary['unique_tournaments']}**",
        '',
        '## Tournaments included',
    ]
    for t in tournaments:
        lines.append(f'- {t}')

    lines.extend(['', '## Top archetypes'])
    for name, count in summary['top_archetypes']:
        lines.append(f'- {name}: {count}')

    lines.extend(['', '## Top legends'])
    for name, count in summary['top_legends']:
        lines.append(f'- {name}: {count}')

    path.write_text('\n'.join(lines) + '\n', encoding='utf-8')


def main() -> None:
    args = parse_args()
    input_path = Path(args.input)
    output_path = Path(args.output)
    report_path = Path(args.report)
    aliases = build_aliases(args.source)

    rows = load_rows(input_path)

    normalized = []
    for row in rows:
        mapped = {k: pick(row, aliases, k) for k in aliases.keys()}

        if normalize_header(mapped['patch']) != normalize_header(args.patch):
            continue
        if not placement_in_cut(mapped['placement'], args.top_cut):
            continue
        if args.require_major and not is_major_tier(mapped['tournament_tier']):
            continue

        mapped['verification_status'] = row.get('verification_status', 'unverified') or 'unverified'
        mapped['notes'] = row.get('notes', f'Imported from {args.source} export')
        mapped['source_site'] = args.source

        normalized.append({f: mapped.get(f, '') for f in OUTPUT_FIELDS})

    write_csv(output_path, normalized)
    summary = summarize(normalized)
    write_markdown_report(report_path, summary, normalized, args.source)

    print(f'Source: {args.source}')
    print(f'Input rows: {len(rows)}')
    print(f'Kept rows: {len(normalized)}')
    print(f'Wrote: {output_path}')
    print(f'Wrote: {report_path}')


if __name__ == '__main__':
    main()
