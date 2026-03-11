# Deckbuilder Analysis Integration

Ce dossier contient une intégration exploitable du moteur d'analyse Riftbound dans une UI React.

## Fichiers

- `analysisAdapter.js` : adaptateurs UI pour:
  - `analyzeDeckForUI(...)`
  - `compareDecksForUI(...)`
  - `buildMatchupsForUI(...)`
- `AnalysisPanel.jsx` : panneau React branchable dans la page deck builder.

## Intégration rapide

1. Passe un objet `deck` avec `{ legendId, chosenChampionId, battlefieldId, cards, archetype? }`.
2. Passe le mapping `legendChampionMap`.
3. Optionnel: `synergyRules`, `veteranClaims`, `packages`, `matchResults`, `previousDeckCards`, `confidenceGate`, `advisorPolicy`.

## Capacités UI phase 3

- Mode `compact` / `expert`.
- Section explicable: **Pourquoi cette recommandation ?**
- Comparaison de version: **version actuelle vs précédente**.

- Marqueurs 4 couches: validité structurelle, stabilité intrinsèque, cohérence stratégique, résilience méta.

- Deck health : Keep Quality Index (global + vs archetypes), Dead Draw Risk (T1–T4), Redundancy Score.

- Battlefield : `battlefieldId` est requis pour refléter la composition complète du deck.


- Rules badge : statut/source/version/date des règles appliquées dans l'analyse.


- Conseiller deckbuilder consolidé: sortie `advisor.light` (rapide) et `advisor.premium` (détaillé avec evidence).


- Le mode premium passe automatiquement en **conservateur** si l'échantillon matchup est sous le seuil (`advisorPolicy.premiumMinMatchSample`, défaut 20).
