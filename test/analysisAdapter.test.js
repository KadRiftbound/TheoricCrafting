import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeDeckForUI,
  compareDecksForUI,
  buildMatchupsForUI,
} from '../app/deckbuilder/analysisAdapter.js';

const cards = [
  { id: 'u1', qty: 10, cost: 1, type: 'unit', tags: ['starter'] },
  { id: 'u2', qty: 8, cost: 2, type: 'unit', tags: ['payoff'] },
  { id: 'g1', qty: 5, cost: 1, type: 'gear', tags: ['support'] },
  { id: 's1', qty: 8, cost: 3, type: 'spell', subtype: 'action' },
  { id: 's2', qty: 8, cost: 4, type: 'spell', subtype: 'reaction' },
];

test('analyzeDeckForUI returns summary-friendly payload + recommendation reasons', () => {
  const out = analyzeDeckForUI({
    deck: { legendId: 'legend-a', chosenChampionId: 'champ-a', battlefieldId: 'bf-a', archetype: 'tempo', cards },
    previousDeckCards: [{ id: 'u1', qty: 9, cost: 1, type: 'unit', tags: ['starter'] }],
    legendChampionMap: { 'legend-a': 'champ-a' },
    synergyRules: [{ name: 'starter', requiredTags: ['starter'], minCopies: 1 }],
    veteranClaims: [{ topic: 'payoff bundle', confidence: 'high', suggested_tags: 'payoff' }],
    packages: [{ name: 'core', cardIds: ['u1', 'u2'] }],
    matchResults: [{ deckVersionId: 'v1', opponentArchetype: 'aggro', result: 'win' }],
  });

  assert.equal(out.summary.isLegal, true);
  assert.ok(typeof out.summary.score === 'number');
  assert.ok(Array.isArray(out.probabilities));
  assert.ok(Array.isArray(out.recommendationReasons));
  assert.ok(out.recommendationReasons.length >= 1);
  assert.ok(out.recommendationReasons.every((r) => r.decisionConfidence && r.decisionConfidence.score >= 0));
  assert.ok(out.recommendationReasons.filter((r) => r.decisionConfidence?.strength === 'strong').every((r) => r.decisionConfidence.score >= 0.75));
  assert.ok(out.versionComparison);
  assert.equal(out.summary.profileUsed, 'tempo');
  assert.equal(out.summary.battlefieldId, 'bf-a');
  assert.ok(out.summary.matchupSampleSize >= 1);
  assert.ok(out.summary.layeredMarkers.metaResilience);
  assert.ok(out.summary.decisionQualityScore);
  assert.ok(out.summary.decisionQualityScore.components.recommendationConfidence.score >= 0);
  assert.ok(out.summary.keepQualityGlobal >= 0);
  assert.ok(out.summary.deadDrawRiskAverage >= 0);
  assert.ok(out.summary.redundancyScore >= 0);
  assert.ok(out.summary.rulesSourceStatus);
  assert.ok(out.summary.rulesSourceVersion);
  assert.ok(out.summary.rulesPublishedAt);
  assert.ok(out.summary.rulesAssumptionsCount >= 0);
  assert.ok(Array.isArray(out.evidenceCards));
  assert.ok(out.advisor?.light?.recommendations?.length >= 1);
  assert.ok(out.advisor?.premium?.recommendations?.length >= 1);
  assert.ok(typeof out.advisor?.premium?.conservativeMode === 'boolean');
});

test('compareDecksForUI proxies version diff', () => {
  const out = compareDecksForUI([{ id: 'a', qty: 2 }], [{ id: 'a', qty: 1 }, { id: 'b', qty: 1 }]);
  assert.equal(out.changes.length, 2);
});

test('buildMatchupsForUI aggregates results and supports options', () => {
  const out = buildMatchupsForUI(
    [
      { deckVersionId: 'v1', opponentArchetype: 'aggro', result: 'win' },
      { deckVersionId: 'v1', opponentArchetype: 'aggro', result: 'loss' },
    ],
    { extended: true },
  );

  assert.equal(out.meta.totalMatches, 2);
  assert.ok(out.meta.sampleSizeThreshold >= 1);
});


test('analyzeDeckForUI applies confidence gate on strong recommendations with low sample', () => {
  const out = analyzeDeckForUI({
    deck: { legendId: 'legend-a', chosenChampionId: 'champ-a', battlefieldId: 'bf-a', archetype: 'tempo', cards },
    legendChampionMap: { 'legend-a': 'champ-a' },
    matchResults: [{ deckVersionId: 'v1', opponentArchetype: 'aggro', result: 'loss' }],
    confidenceGate: { minStrongScore: 0.75, minStrongSample: 0.95 },
  });

  assert.ok(out.recommendationReasons.every((r) => r.impactScore >= 0));
  assert.ok(out.recommendationReasons.every((r) => ['strong', 'medium', 'weak'].includes(r.decisionConfidence.strength)));
  assert.ok(out.recommendationReasons.filter((r) => r.decisionConfidence.gateApplied).every((r) => r.decisionConfidence.strength !== 'strong'));
});


test('premium mode becomes non-conservative with enough matchup sample', () => {
  const manyMatches = Array.from({ length: 25 }, (_, i) => ({
    deckVersionId: 'v1',
    opponentArchetype: i % 2 ? 'aggro' : 'control',
    result: i % 3 ? 'win' : 'loss',
  }));

  const out = analyzeDeckForUI({
    deck: { legendId: 'legend-a', chosenChampionId: 'champ-a', battlefieldId: 'bf-a', archetype: 'tempo', cards },
    legendChampionMap: { 'legend-a': 'champ-a' },
    matchResults: manyMatches,
    advisorPolicy: { premiumMinMatchSample: 20 },
  });

  assert.equal(out.advisor.premium.conservativeMode, false);
  assert.ok(out.advisor.premium.recommendations.length >= 3);
});
