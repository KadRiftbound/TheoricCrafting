# Project structure (cleaned)

## Core code
- `analysis-engine/`: moteur d'analyse et configuration de règles.
- `app/deckbuilder/`: adapter + panneau React consommant le moteur.
- `test/`: tests unitaires moteur + adapter.

## Data (versionnée)
- `data/sources/`: templates source de vérité (Top64 + claims).
- `research/research_base.json`: base consolidée générée depuis les templates.

## Documentation
- `docs/riftbound-theorycraft-product-brief.md`: vision produit.
- `docs/rules/official-rules-intake.md`: ingestion des règles officielles.
- `research/source-reliability-framework.md`: cadre qualité des sources.

## Generated artifacts (non versionnés)
- `data/raw/`
- `data/processed/`
- `research/reports/`
