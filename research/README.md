# Recherche Spiritforged (Top 64 + discussions vétérans)

Ce dossier contient la base de recherche versionnée **essentielle**.

## Sources versionnées

- `data/sources/spiritforged_top64_template.csv`
- `data/sources/veteran_discussions_template.csv`
- `research/source-reliability-framework.md`

## Générer la base consolidée

```bash
python scripts/prepare_research_base.py
```

Sortie:

- `research/research_base.json`

## Générer un rapport claims vétérans

```bash
python scripts/build_veteran_claims_report.py
```

Sortie (non versionnée):

- `research/reports/veteran-claims-report.md`

## Politique de clean

- Les fichiers `data/raw/`, `data/processed/` et `research/reports/` sont des artefacts de travail.
- Ils sont générables localement et ne doivent pas être versionnés.


## Contrôle qualité compétitif (Sprint B)

```bash
python scripts/check_research_quality.py
```

Mode bloquant (CI):

```bash
python scripts/check_research_quality.py --enforce
```


## Croiser claims vétérans et Top64

```bash
python scripts/cross_claims_with_top64.py
```

Sortie:

- `research/claims_top64_cross.json` (inclut recommandations `light_advisor` et `premium_advisor`).


## Scraping Top64 majors (Bologna / Las Vegas / China March 2026)

Dans cet environnement, le scraping web direct est bloqué (403).
Utiliser des pages HTML exportées localement puis:

```bash
python scripts/scrape_major_top64_from_html.py --input-dir data/raw/majors_html
```


## CI qualité

Le workflow `.github/workflows/quality-gates.yml` exécute les tests et le gate strict production (`--enforce --min-top64 200 --min-claims 50`).
