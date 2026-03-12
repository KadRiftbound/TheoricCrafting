# Riftbound Analysis Engine (MVP foundation)

Ce dossier contient un socle exécutable pour intégrer l'analyse theorycraft dans le deck builder React.

## Fonctions disponibles

### Validation / structure
- `validateDeckRiftbound(deck, legendChampionMap)`

### Statistiques deck
- `computeCurve(cards)`
- `computeTypeDistribution(cards)`
- `computeSubtypeDistribution(cards)`
- `computeCoherenceScore(deckCards, options)` (support profil d'archétype)

### Probabilités / simulation
- `computePackageProbabilities(deckCards, packageCardIds, draws)`
- `computeMultiPackageProbabilities(deckCards, packageDefinitions, draws)`
- `simulateOpeningHands(deckCards, options)`
- `computeKeepQualityIndex(deckCards, options)`
- `computeDeadDrawRisk(deckCards, options)`
- `computeRedundancyScore(deckCards, options)`

### Calibration data-driven
- `buildMatchupMatrix(matchResults, { extended: true })` pour stats par matchup, archétype et version
- `buildSynergyRulesFromVeteranClaims(claims, options)`
- `confidenceToWeight(confidence)`
- `DEFAULT_ARCHETYPE_PROFILES`
- `computeLayeredDeckMarkers(context)` (4 couches: structure, stabilité, stratégie, méta)

### Analyse qualitative heuristique
- `detectInternalConflicts(deckCards, options)`
- `detectSynergyCandidates(deckCards, rules)` (score pondéré par confiance)
- `suggestCutsAdds(deckCards, cardPool, options)`

### Versioning / comparaison
- `compareDeckVersions(prevCards, nextCards)`

### Pipeline complet
- `runFullAnalysis(input)`
  - accepte `veteranClaims`, `matchResults`, `archetype`/`archetypeProfiles`
  - renvoie `layeredMarkers` (les 4 couches de solidité du deck)

## Notes

- Le moteur reste volontairement **rules-lite**.
- Les contraintes deck implémentées sont celles confirmées: 1 légende, 1 chosen champ, 1 battlefield, 39 cartes main deck (hors battlefield).
- Les règles issues de claims vétérans sont pondérées par confiance et doivent rester validées par data tournoi.

## Lancer les tests

```bash
npm test
```

## Rules snapshot

Deck-construction constraints are centralized in `analysis-engine/rulesConfig.js` (`RIFTBOUND_RULES_SNAPSHOT`) and consumed by `validateDeckRiftbound`.
Update this file first when official rules are confirmed.
