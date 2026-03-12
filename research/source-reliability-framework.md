# Source Reliability Framework (Phase 2)

## Objectif

Prioriser les sources les plus robustes pour remplir `veteran_discussions_template.csv` sans mélanger opinion isolée et signal compétitif solide.

## Hiérarchie recommandée

1. **Data tournoi vérifiable (High)**
   - decklists + brackets + dates + patch
   - ex: TopDeck.gg, Piltover Archive, Riftbound.gg
2. **Analyses expertes multi-events (Medium/High)**
   - analystes/casters/pro players explicitant une méthodologie reproductible
3. **Forums communautaires (Low/Medium)**
   - utile pour hypothèses, jamais suffisant seul

## Règles d'intégration des claims

- Chaque claim doit avoir: `topic`, `claim`, `evidence_type`, `confidence`.
- Tout claim non corroboré par data tournoi reste en `low` ou `medium`.
- Les claims peuvent inspirer des règles heuristiques, mais pas des décisions automatiques sans validation.

## Format conseillé

- `evidence_type`:
  - `data_backed`
  - `expert_review`
  - `methodological`
  - `anecdotal`
- `confidence`:
  - `high`
  - `medium`
  - `low`
