# Contrat d'intégration deckbuilder (site)

## Input minimal (`analyzeDeckForUI`)

```ts
{
  deck: {
    legendId: string,
    chosenChampionId: string,
    battlefieldId: string,
    archetype?: string,
    cards: Array<{ id: string, qty: number, cost?: number, type?: string, subtype?: string, tags?: string[] }>
  },
  legendChampionMap: Record<string, string>,
  matchResults?: Array<{ deckVersionId?: string, opponentArchetype?: string, result: 'win'|'loss'|'draw' }>,
  veteranClaims?: Array<object>,
  packages?: Array<{ name: string, cardIds: string[] }>,
  previousDeckCards?: Array<object>,
  confidenceGate?: { minStrongScore?: number, minStrongSample?: number },
  advisorPolicy?: { premiumMinMatchSample?: number }
}
```

## Output clé

- `summary`: légalité, score, keep rate, profil, rules badge, etc.
- `recommendationReasons`: raisons triées par impact et confiance.
- `evidenceCards`: explications traçables.
- `advisor.light`: recommandations rapides (<=3).
- `advisor.premium`: recommandations détaillées, avec mode conservateur automatique si sample matchup insuffisant.
