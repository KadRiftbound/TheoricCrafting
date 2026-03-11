#!/usr/bin/env python3
"""Parse locally saved tournament HTML pages and extract Top64 rows for target majors.

Why local HTML?
- This environment cannot directly fetch public sites (HTTP 403), so this script allows
  scraping from browser-saved pages exported by the user.

Targets:
- Bologna (Europe Regional)
- Las Vegas (US Regional)
- Chinese Regionals (March 2026)
"""

from __future__ import annotations

import argparse
import csv
import re
from html.parser import HTMLParser
from pathlib import Path

OUTPUT_FIELDS = [
    'tournament_name','tournament_tier','date','patch','placement','player',
    'archetype','legend','chosen_champion','battlefield','decklist_source_url',
    'vod_or_bracket_url','verification_status','notes','source_site'
]

TARGET_PATTERNS = [
    re.compile(r'bologn', re.I),
    re.compile(r'las\s*vegas', re.I),
    re.compile(r'(china|chinese).*regional', re.I),
]


def normalize(v: str) -> str:
    return re.sub(r'\s+', ' ', (v or '').strip())


class SimpleTableParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.in_tr = False
        self.in_cell = False
        self.current_cell = []
        self.current_row = []
        self.rows = []
        self.current_href = None

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'tr':
            self.in_tr = True
            self.current_row = []
        elif self.in_tr and tag in {'td', 'th'}:
            self.in_cell = True
            self.current_cell = []
            self.current_href = None
        elif self.in_cell and tag == 'a':
            self.current_href = attrs.get('href')

    def handle_data(self, data):
        if self.in_cell:
            self.current_cell.append(data)

    def handle_endtag(self, tag):
        if self.in_tr and tag in {'td', 'th'} and self.in_cell:
            text = normalize(''.join(self.current_cell))
            if self.current_href:
                text = f"{text} || URL:{self.current_href}"
            self.current_row.append(text)
            self.in_cell = False
            self.current_cell = []
            self.current_href = None
        elif tag == 'tr' and self.in_tr:
            if any(c.strip() for c in self.current_row):
                self.rows.append(self.current_row)
            self.in_tr = False
            self.current_row = []


def infer_columns(header: list[str]) -> dict[str, int]:
    h = [x.lower() for x in header]

    def token_match(label: str, tokens: tuple[str, ...]) -> bool:
        words = re.findall(r'[a-z0-9]+', label)
        return any(t in words for t in tokens)

    def find(*tokens):
        for i, name in enumerate(h):
            if token_match(name, tuple(tokens)):
                return i
        return -1

    return {
        'placement': find('placement','place','rank','standing','position'),
        'player': find('player','pilot'),
        'archetype': find('archetype','deck','lineup'),
        'legend': find('legend'),
        'chosen_champion': find('champion','chosen'),
        'battlefield': find('battlefield'),
        'date': find('date'),
        'patch': find('patch','set','format','version'),
        'tournament_name': find('tournament','event'),
    }


def split_url_cell(value: str) -> tuple[str, str]:
    if '|| URL:' in value:
        left, right = value.split('|| URL:', 1)
        return normalize(left), normalize(right)
    return normalize(value), ''


def row_val(row: list[str], idx: int) -> str:
    if idx < 0 or idx >= len(row):
        return ''
    return row[idx]


def looks_target(name: str) -> bool:
    return any(p.search(name or '') for p in TARGET_PATTERNS)


def is_march_2026(date_text: str) -> bool:
    t = (date_text or '').lower()
    return '2026-03' in t or 'march 2026' in t or '/03/2026' in t


def parse_file(path: Path, source_site: str, default_patch: str) -> list[dict[str, str]]:
    parser = SimpleTableParser()
    parser.feed(path.read_text(encoding='utf-8', errors='ignore'))
    rows = parser.rows
    if not rows:
        return []

    header_idx = 0
    max_hits = -1
    for i, r in enumerate(rows[:50]):
        joined = ' '.join(x.lower() for x in r)
        hits = sum(k in joined for k in ['player','place','deck','archetype','rank'])
        if hits > max_hits:
            max_hits = hits
            header_idx = i

    header = rows[header_idx]
    col = infer_columns(header)

    out = []
    for r in rows[header_idx + 1:]:
        placement = normalize(row_val(r, col['placement']))
        if not placement.isdigit() or not (1 <= int(placement) <= 64):
            continue

        tournament_name = normalize(row_val(r, col['tournament_name']))
        date = normalize(row_val(r, col['date']))

        # Allow target detection from file name fallback
        fallback_name = path.stem.replace('_', ' ')
        if not tournament_name:
            tournament_name = fallback_name

        # Regional China condition includes date guard
        name_l = tournament_name.lower()
        if 'china' in name_l or 'chinese' in name_l:
            if not is_march_2026(date):
                continue

        if not looks_target(tournament_name):
            continue

        player, player_url = split_url_cell(normalize(row_val(r, col['player'])))
        archetype, deck_url = split_url_cell(normalize(row_val(r, col['archetype'])))
        legend = normalize(row_val(r, col['legend']))
        champion = normalize(row_val(r, col['chosen_champion']))
        battlefield = normalize(row_val(r, col['battlefield']))
        patch = normalize(row_val(r, col['patch'])) or default_patch

        out.append({
            'tournament_name': tournament_name,
            'tournament_tier': 'major',
            'date': date or 'unknown',
            'patch': patch,
            'placement': placement,
            'player': player,
            'archetype': archetype,
            'legend': legend,
            'chosen_champion': champion,
            'battlefield': battlefield,
            'decklist_source_url': deck_url,
            'vod_or_bracket_url': player_url,
            'verification_status': 'unverified',
            'notes': f'Extracted from local HTML: {path.name}',
            'source_site': source_site,
        })
    return out


def read_existing(path: Path) -> list[dict[str, str]]:
    if not path.exists():
        return []
    with path.open(newline='', encoding='utf-8') as f:
        return list(csv.DictReader(f))


def write_rows(path: Path, rows: list[dict[str, str]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=OUTPUT_FIELDS)
        w.writeheader()
        w.writerows(rows)


def dedupe(rows: list[dict[str, str]]) -> list[dict[str, str]]:
    seen = set()
    out = []
    for r in rows:
        key = (r.get('tournament_name',''), r.get('placement',''), r.get('player',''))
        if key in seen:
            continue
        seen.add(key)
        out.append(r)
    return out


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser()
    p.add_argument('--input-dir', default='data/raw/majors_html')
    p.add_argument('--output', default='data/sources/spiritforged_top64_template.csv')
    p.add_argument('--source-site', default='manual_html_scrape')
    p.add_argument('--default-patch', default='Spiritforged')
    p.add_argument('--replace', action='store_true', default=False)
    return p.parse_args()


def main() -> int:
    args = parse_args()
    input_dir = Path(args.input_dir)
    html_files = sorted(input_dir.glob('*.html')) + sorted(input_dir.glob('*.htm'))
    extracted = []
    for p in html_files:
        extracted.extend(parse_file(p, args.source_site, args.default_patch))

    if args.replace:
        final_rows = dedupe(extracted)
    else:
        existing = read_existing(Path(args.output))
        final_rows = dedupe(existing + extracted)

    write_rows(Path(args.output), final_rows)
    print(f'HTML files scanned: {len(html_files)}')
    print(f'Rows extracted: {len(extracted)}')
    print(f'Rows written: {len(final_rows)}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
