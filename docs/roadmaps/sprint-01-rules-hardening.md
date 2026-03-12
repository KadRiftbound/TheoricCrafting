# Sprint 01 — Rules hardening (en cours)

## Objectif
Passer du mode rules-lite vers rules-backed, pour fiabiliser la légalité et les marqueurs dépendants des règles.

## Checklist
- [ ] Ingestion du texte officiel dans `analysis-engine/rulesConfig.js` (bloqué: PDF inaccessible automatiquement, 403)
- [x] Ajout de metadata `rulesVersion`/`rulesSource` dans la sortie de `runFullAnalysis`
- [x] Tests unitaires: version/source présentes + comportement si règles incomplètes
- [x] Affichage UI minimal de la source de règles dans `AnalysisPanel` (rules badge)

## Démarrage effectué
- Prompt d'exécution projet ajouté: `docs/prompts/riftbound_execution_prompt.md`
- Rules badge câblé bout-en-bout (engine -> adapter -> UI).
- Garde-fou Sprint B amorcé: script `scripts/check_research_quality.py` pour seuils volumétrie + distribution confidence.

## Hypothèses à valider
- Le PDF officiel sera disponible localement pour extraction structurée.
