import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateDeckRiftbound,
  computeCurve,
  computeTypeDistribution,
  computeSubtypeDistribution,
  computePackageProbabilities,
  computeMultiPackageProbabilities,
  simulateOpeningHands,
  compareDeckVersions,
  computeCoherenceScore,
  detectInternalConflicts,
  detectSynergyCandidates,
  suggestCutsAdds,
  buildMatchupMatrix,
  buildSynergyRulesFromVeteranClaims,
  confidenceToWeight,
  computeKeepQualityIndex,
  computeDeadDrawRisk,
  computeRedundancyScore,
  computeLayeredDeckMarkers,
  computeDecisionQualityScore,
  runFullAnalysis,
} from '../analysis-engine/riftboundAnalysis.js';

const sampleDeckCards = [
  { id: 'u1', qty: 10, cost: 1, type: 'unit', tags: ['starter'] },
  { id: 'u2', qty: 8, cost: 2, type: 'unit', tags: ['payoff'] },
  { id: 'g1', qty: 5, cost: 1, type: 'gear', tags: ['support'] },
  { id: 's1', qty: 8, cost: 3, type: 'spell', subtype: 'action', tags: ['situational'] },
  { id: 's2', qty: 8, cost: 4, type: 'spell', subtype: 'reaction' },
];

test('validateDeckRiftbound validates core constraints', () => {
  const deck = {
    legendId: 'legend-a',
    chosenChampionId: 'champ-a',
    battlefieldId: 'bf-a',
    cards: sampleDeckCards,
  };
  const mapping = { 'legend-a': 'champ-a' };

  const result = validateDeckRiftbound(deck, mapping);
  assert.equal(result.isValid, true);
  assert.equal(result.metrics.mainDeckCount, 39);
  assert.equal(result.metrics.hasBattlefield, true);
});

test('computeCurve returns sorted buckets with ratio', () => {
  const curve = computeCurve(sampleDeckCards);
  assert.equal(curve.total, 39);
  assert.deepEqual(curve.curve[0], { cost: 1, qty: 15, ratio: 15 / 39 });
});

test('computeTypeDistribution returns known types', () => {
  const dist = computeTypeDistribution(sampleDeckCards);
  assert.equal(dist.find((d) => d.type === 'unit')?.qty, 18);
  assert.equal(dist.find((d) => d.type === 'spell')?.qty, 16);
});

test('computeSubtypeDistribution returns spell subtypes', () => {
  const dist = computeSubtypeDistribution(sampleDeckCards);
  assert.equal(dist.find((d) => d.subtype === 'action')?.qty, 8);
  assert.equal(dist.find((d) => d.subtype === 'reaction')?.qty, 8);
});

test('computePackageProbabilities computes at least one hit', () => {
  const out = computePackageProbabilities(sampleDeckCards, ['u1', 's1'], 8);
  assert.equal(out.population, 39);
  assert.equal(out.packageCopies, 18);
  assert.ok(out.atLeastOne > 0.9);
});

test('computeMultiPackageProbabilities computes multiple packages', () => {
  const out = computeMultiPackageProbabilities(
    sampleDeckCards,
    [
      { name: 'early', cardIds: ['u1', 'u2'] },
      { name: 'interaction', cardIds: ['s1'] },
    ],
    8,
  );

  assert.equal(out.length, 2);
  assert.equal(out[0].name, 'early');
  assert.ok(out[0].atLeastOne > out[1].atLeastOne);
});

test('simulateOpeningHands returns bounded keepRate', () => {
  const out = simulateOpeningHands(sampleDeckCards, { iterations: 200, handSize: 7 });
  assert.equal(out.iterations, 200);
  assert.ok(out.keepRate >= 0 && out.keepRate <= 1);
});

test('compareDeckVersions highlights deltas', () => {
  const prev = [
    { id: 'a', qty: 3 },
    { id: 'b', qty: 2 },
  ];
  const next = [
    { id: 'a', qty: 1 },
    { id: 'c', qty: 2 },
  ];

  const out = compareDeckVersions(prev, next);
  assert.equal(out.changes.length, 3);
  assert.equal(out.added.length, 1);
  assert.equal(out.removed.length, 2);
});

test('computeCoherenceScore uses archetype profile targets', () => {
  const out = computeCoherenceScore(sampleDeckCards, { archetype: 'tempo' });
  assert.equal(out.profileUsed, 'tempo');
  assert.equal(out.targets.unit, 0.5);
  assert.ok(Number.isInteger(out.score));
});

test('detectInternalConflicts flags top-end overload', () => {
  const heavyDeck = [
    { id: 'x1', qty: 20, cost: 6, type: 'unit', tags: ['situational'] },
    { id: 'x2', qty: 19, cost: 1, type: 'unit' },
  ];

  const out = detectInternalConflicts(heavyDeck);
  assert.ok(out.alerts.length >= 1);
  assert.ok(out.alerts.some((a) => a.code === 'HIGH_TOP_END'));
});

test('buildSynergyRulesFromVeteranClaims creates weighted rules', () => {
  const rules = buildSynergyRulesFromVeteranClaims([
    { topic: 'Core package', confidence: 'high', suggested_tags: 'starter,payoff', minCopies: 2 },
    { topic: 'Weak claim', confidence: 'low', suggested_tags: 'situational' },
  ]);

  assert.equal(rules.length, 1);
  assert.equal(rules[0].confidenceWeight, 1);
  assert.deepEqual(rules[0].requiredTags, ['starter', 'payoff']);
});

test('detectSynergyCandidates includes weighted score', () => {
  const rules = [
    { name: 'Starter package', requiredTags: ['starter'], minCopies: 1, confidence: 'high' },
    { name: 'Situational package', requiredTags: ['situational'], minCopies: 12, confidence: 'medium' },
  ];

  const out = detectSynergyCandidates(sampleDeckCards, rules);
  assert.equal(out.length, 2);
  assert.ok(out[0].weightedScore >= out[1].weightedScore);
});

test('confidenceToWeight maps values', () => {
  assert.equal(confidenceToWeight('high'), 1);
  assert.equal(confidenceToWeight('medium'), 0.7);
  assert.equal(confidenceToWeight('unknown'), 0.5);
});

test('suggestCutsAdds suggests early stabilization from pool', () => {
  const deck = [
    { id: 'hi1', qty: 12, cost: 6, type: 'unit' },
    { id: 'mid1', qty: 27, cost: 4, type: 'spell' },
  ];
  const pool = [{ id: 'low1', qty: 0, cost: 1, type: 'unit' }];

  const out = suggestCutsAdds(deck, pool);
  assert.ok(out.cuts.length >= 1);
  assert.ok(out.adds.length >= 1);
});

test('buildMatchupMatrix supports extended calibrated stats', () => {
  const out = buildMatchupMatrix(
    [
      { deckVersionId: 'v1', opponentArchetype: 'aggro', result: 'win' },
      { deckVersionId: 'v1', opponentArchetype: 'aggro', result: 'loss' },
      { deckVersionId: 'v2', opponentArchetype: 'control', result: 'win' },
    ],
    { extended: true },
  );

  assert.ok(Array.isArray(out.rows));
  assert.equal(out.meta.uniqueOppArchetypes, 2);
  assert.equal(out.versionStats.length, 2);
  assert.ok(out.meta.sampleSizeThreshold >= 1);
  assert.ok(out.meta.confidencePenalty >= 0);
  assert.ok(out.meta.sampleConfidenceGlobal >= 0 && out.meta.sampleConfidenceGlobal <= 1);
  assert.ok(out.archetypeStats.every((r) => r.calibratedWinrate <= r.winrate));
});







test('buildMatchupMatrix applies sample-size confidence penalty calibration', () => {
  const out = buildMatchupMatrix(
    [
      { deckVersionId: 'v1', opponentArchetype: 'aggro', result: 'win' },
      { deckVersionId: 'v1', opponentArchetype: 'aggro', result: 'win' },
    ],
    { extended: true, sampleSizeThreshold: 20, confidencePenalty: 0.3 },
  );

  assert.ok(out.rows[0].sampleConfidence < 1);
  assert.ok(out.rows[0].confidencePenaltyApplied > 0);
  assert.ok(out.rows[0].calibratedWinrate < out.rows[0].winrate);
});

test('computeKeepQualityIndex returns global and vs-archetype keep rates', () => {
  const out = computeKeepQualityIndex(sampleDeckCards, { globalHandOptions: { iterations: 200 } });
  assert.ok(out.keepRateGlobal >= 0 && out.keepRateGlobal <= 1);
  assert.ok(out.keepRateAverageVsArchetypes >= 0 && out.keepRateAverageVsArchetypes <= 1);
  assert.ok(out.keepRateByOpponentArchetype.length >= 3);
});

test('computeDeadDrawRisk returns turn risks (T1-T4)', () => {
  const out = computeDeadDrawRisk(sampleDeckCards, { iterations: 200 });
  assert.equal(out.turns.length, 4);
  assert.ok(out.averageDeadDrawRisk >= 0 && out.averageDeadDrawRisk <= 1);
});

test('computeRedundancyScore returns role redundancy metrics', () => {
  const out = computeRedundancyScore(sampleDeckCards);
  assert.ok(Number.isInteger(out.score));
  assert.ok(out.singleCardDependency >= 0);
  assert.ok(Array.isArray(out.roleStats));
});

test('computeLayeredDeckMarkers returns 4-layer structure', () => {
  const markers = computeLayeredDeckMarkers({
    legality: { isValid: true, errors: [] },
    coherence: { score: 70, subscores: { lowCurveBalance: 60 }, profileUsed: 'tempo' },
    openingHands: { keepRate: 0.6 },
    probabilities: [{ atLeastOne: 0.5 }],
    synergies: [{ isActive: true, weightedScore: 0.8 }],
    matchupInsights: { meta: { totalMatches: 12 }, archetypeStats: [{ winrate: 0.55 }] },
    conflicts: { alerts: [{}, {}] },
  });

  assert.ok(markers.structuralValidity);
  assert.ok(markers.intrinsicStability);
  assert.ok(markers.strategicCoherence);
  assert.ok(markers.metaResilience);
  assert.ok(markers.intrinsicStability.markers.some((m) => m.startsWith('deadDrawRiskAvg=')));
});

test('computeDecisionQualityScore returns 5 components + weighted global', () => {
  const out = computeDecisionQualityScore({
    layeredMarkers: {
      structuralValidity: { score: 100, status: 'ok', markers: [] },
      intrinsicStability: { score: 68, status: 'stable', markers: [] },
      strategicCoherence: { score: 72, status: 'aligned', markers: [] },
      metaResilience: { score: 50, status: 'data_backed', markers: [] },
    },
    veteranRules: [{ confidenceWeight: 1 }, { confidenceWeight: 0.7 }],
    recommendationReasons: [{}, {}, {}],
    matchupInsights: { meta: { totalMatches: 20 } },
  });

  assert.ok(Number.isInteger(out.score));
  assert.ok(out.components.structuralIntegrity);
  assert.ok(out.components.consistency);
  assert.ok(out.components.strategicCoherence);
  assert.ok(out.components.metaEvidence);
  assert.ok(out.components.recommendationConfidence);
});

test('runFullAnalysis returns calibrated sections', () => {
  const deck = {
    legendId: 'legend-a',
    chosenChampionId: 'champ-a',
    battlefieldId: 'bf-a',
    archetype: 'tempo',
    cards: sampleDeckCards,
  };

  const out = runFullAnalysis({
    deck,
    legendChampionMap: { 'legend-a': 'champ-a' },
    veteranClaims: [{ topic: 'Starter claim', confidence: 'high', suggested_tags: 'starter' }],
    packages: [{ name: 'core', cardIds: ['u1', 'u2'] }],
    matchResults: [{ deckVersionId: 'v1', opponentArchetype: 'aggro', result: 'win' }],
  });

  assert.equal(out.legality.isValid, true);
  assert.ok(Array.isArray(out.probabilities));
  assert.ok(Array.isArray(out.synergies));
  assert.ok(out.matchupInsights.meta.totalMatches >= 1);
  assert.equal(out.coherence.profileUsed, 'tempo');
  assert.ok(out.layeredMarkers.metaResilience);
  assert.ok(out.decisionQualityScore);
  assert.ok(out.decisionQualityScore.components.recommendationConfidence);
  assert.ok(out.keepQuality.keepRateByOpponentArchetype.length >= 3);
  assert.ok(out.deadDrawRisk.turns.length >= 4);
  assert.ok(out.redundancy.score >= 0);
  assert.ok(out.rules.sourceUrl);
  assert.ok(out.rules.sourceName);
  assert.ok(out.rules.sourceVersion);
  assert.ok(out.rules.sourceLastCheckedAt);
  assert.ok(['provisional', 'unknown'].includes(out.rules.sourceStatus) || out.rules.sourceStatus);
  assert.ok(Array.isArray(out.rules.assumptionsToValidate));
});
