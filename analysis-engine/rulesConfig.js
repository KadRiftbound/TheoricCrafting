/**
 * Riftbound rules snapshot used by the analysis engine.
 *
 * This snapshot is the machine-readable source of truth consumed by legality checks
 * and surfaced in the UI as a rules badge.
 */

export const RIFTBOUND_RULES_SNAPSHOT = {
  source: {
    name: 'Riot Games CMS PDF',
    url: 'https://cmsassets.rgpub.io/sanity/files/dsfx7636/news_live/dbc96e31db9d0257b0791aafb6dbb0cd219d3efb.pdf',
    status: 'provisional',
    version: '2026.01-provisional',
    publishedAt: 'unknown',
    lastCheckedAt: '2026-03-11',
  },
  deckConstruction: {
    mainDeckSize: 39,
    legendRequired: 1,
    chosenChampionRequired: 1,
    battlefieldRequired: 1,
    battlefieldMaxCopies: 1,
    legendAllowedInMainDeck: false,
    maxCopiesPerCard: null,
  },
  assumptionsToValidate: [],
  nonBlockingNotes: [
    'Official PDF fetch is blocked in this environment (HTTP 403) and must be ingested manually for full provenance.',
    'Per-card copy limit rules are not enforced until official text is parsed (hypothèse à valider).',
  ],
};
