/**
 * Riftbound analysis engine (rules-lite).
 *
 * IMPORTANT: This module only implements constraints confirmed in project docs:
 * - 1 legend (outside 39-card main deck)
 * - 1 chosen champion (must map to selected legend)
 * - 1 battlefield (sélectionné dans la composition)
 * - 39 main-deck cards (hors battlefield)
 */

import { RIFTBOUND_RULES_SNAPSHOT } from './rulesConfig.js';

const DECK_RULES = RIFTBOUND_RULES_SNAPSHOT.deckConstruction;

export const CONFIDENCE_WEIGHTS = {
  high: 1,
  medium: 0.7,
  low: 0.4,
  heuristic: 0.5,
};

export const DEFAULT_ARCHETYPE_PROFILES = {
  tempo: { targetUnitRatio: 0.5, targetLowCurveRatio: 0.5 },
  aggro: { targetUnitRatio: 0.55, targetLowCurveRatio: 0.6 },
  midrange: { targetUnitRatio: 0.48, targetLowCurveRatio: 0.45 },
  control: { targetUnitRatio: 0.38, targetLowCurveRatio: 0.3 },
};

function sumQty(cards = []) {
  return cards.reduce((acc, c) => acc + (c.qty || 0), 0);
}


function splitDeckByBattlefield(cards = []) {
  const battlefieldCards = cards.filter((c) => normalizeTag(c.type) === 'battlefield');
  const mainDeckCards = cards.filter((c) => normalizeTag(c.type) !== 'battlefield');
  return { mainDeckCards, battlefieldCards };
}

function nChooseK(n, k) {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  const kk = Math.min(k, n - k);
  let result = 1;
  for (let i = 1; i <= kk; i++) {
    result = (result * (n - kk + i)) / i;
  }
  return result;
}

function hypergeomAtLeastOne(populationSize, successInPopulation, draws) {
  if (populationSize <= 0 || draws <= 0 || successInPopulation <= 0) return 0;
  if (draws > populationSize || successInPopulation > populationSize) return 0;
  const missAll = nChooseK(populationSize - successInPopulation, draws) / nChooseK(populationSize, draws);
  return 1 - missAll;
}

function normalizeTag(tag) {
  return String(tag || '').trim().toLowerCase();
}

export function confidenceToWeight(confidence) {
  return CONFIDENCE_WEIGHTS[normalizeTag(confidence)] ?? CONFIDENCE_WEIGHTS.heuristic;
}

function normalizeArchetype(archetype) {
  return normalizeTag(archetype).replace(/\s+/g, '_');
}

function parseTagList(value) {
  if (Array.isArray(value)) return value.map(normalizeTag).filter(Boolean);
  return String(value || '')
    .split(/[|,;]+/)
    .map(normalizeTag)
    .filter(Boolean);
}

export function validateDeckRiftbound(deck, legendChampionMap = {}) {
  const errors = [];
  const warnings = [];

  if (DECK_RULES.legendRequired > 0 && !deck?.legendId) errors.push('Missing legendId.');
  if (DECK_RULES.chosenChampionRequired > 0 && !deck?.chosenChampionId) errors.push('Missing chosenChampionId.');

  const { mainDeckCards, battlefieldCards } = splitDeckByBattlefield(deck?.cards || []);
  const mainCount = sumQty(mainDeckCards);
  const battlefieldCount = sumQty(battlefieldCards);
  const hasBattlefieldSelection = Boolean(deck?.battlefieldId) || battlefieldCount > 0;

  if (mainCount !== DECK_RULES.mainDeckSize) {
    errors.push(`Main deck must contain exactly ${DECK_RULES.mainDeckSize} cards (got ${mainCount}).`);
  }

  if (DECK_RULES.battlefieldRequired > 0 && !hasBattlefieldSelection) {
    errors.push('Missing battlefield selection (battlefieldId or battlefield card in deck).');
  }

  if (battlefieldCount > DECK_RULES.battlefieldMaxCopies) {
    errors.push(`Only ${DECK_RULES.battlefieldMaxCopies} battlefield is allowed (got ${battlefieldCount}).`);
  }

  const legendInMain = mainDeckCards.some((c) => c.id === deck?.legendId);
  if (!DECK_RULES.legendAllowedInMainDeck && legendInMain) {
    errors.push(`Legend cannot be included in the ${DECK_RULES.mainDeckSize}-card main deck.`);
  }

  const mappedChampion = legendChampionMap[deck?.legendId];
  if (mappedChampion && mappedChampion !== deck?.chosenChampionId) {
    errors.push('chosenChampionId does not match the legend -> champion mapping.');
  }
  if (!mappedChampion) {
    warnings.push('No mapping found for legendId (hypothèse à valider / mapping incomplet).');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    metrics: {
      mainDeckCount: mainCount,
      battlefieldCount,
      hasBattlefield: hasBattlefieldSelection,
      hasLegend: Boolean(deck?.legendId),
      hasChosenChampion: Boolean(deck?.chosenChampionId),
    },
  };
}

export function computeCurve(cards = []) {
  const byCost = {};
  let total = 0;

  for (const card of cards) {
    const qty = card.qty || 0;
    const cost = Number.isFinite(card.cost) ? card.cost : -1;
    byCost[cost] = (byCost[cost] || 0) + qty;
    total += qty;
  }

  const curve = Object.entries(byCost)
    .map(([cost, qty]) => ({ cost: Number(cost), qty, ratio: total ? qty / total : 0 }))
    .sort((a, b) => a.cost - b.cost);

  return { total, curve };
}

export function computeTypeDistribution(cards = []) {
  const distribution = {};
  let total = 0;

  for (const card of cards) {
    const key = card.type || 'unknown';
    const qty = card.qty || 0;
    distribution[key] = (distribution[key] || 0) + qty;
    total += qty;
  }

  return Object.entries(distribution)
    .map(([type, qty]) => ({ type, qty, ratio: total ? qty / total : 0 }))
    .sort((a, b) => b.qty - a.qty);
}

export function computeSubtypeDistribution(cards = []) {
  const distribution = {};
  let total = 0;

  for (const card of cards) {
    if (!card.subtype) continue;
    const qty = card.qty || 0;
    distribution[card.subtype] = (distribution[card.subtype] || 0) + qty;
    total += qty;
  }

  return Object.entries(distribution)
    .map(([subtype, qty]) => ({ subtype, qty, ratio: total ? qty / total : 0 }))
    .sort((a, b) => b.qty - a.qty);
}

export function computePackageProbabilities(deckCards = [], packageCardIds = [], draws = 8) {
  const population = sumQty(deckCards);
  const packageCopies = deckCards
    .filter((c) => packageCardIds.includes(c.id))
    .reduce((acc, c) => acc + (c.qty || 0), 0);

  return {
    draws,
    population,
    packageCopies,
    atLeastOne: hypergeomAtLeastOne(population, packageCopies, draws),
  };
}

export function computeMultiPackageProbabilities(deckCards = [], packageDefinitions = [], draws = 8) {
  return packageDefinitions.map((pkg) => ({
    name: pkg.name,
    ...computePackageProbabilities(deckCards, pkg.cardIds || [], draws),
  }));
}

function randomInt(maxExclusive, rng = Math.random) {
  return Math.floor(rng() * maxExclusive);
}

function drawWithoutReplacement(pool, count, rng = Math.random) {
  const working = [...pool];
  const hand = [];
  for (let i = 0; i < count && working.length > 0; i++) {
    const idx = randomInt(working.length, rng);
    hand.push(working[idx]);
    working.splice(idx, 1);
  }
  return hand;
}

function explodeCards(deckCards = []) {
  const result = [];
  for (const card of deckCards) {
    for (let i = 0; i < (card.qty || 0); i++) result.push(card);
  }
  return result;
}

export function simulateOpeningHands(deckCards = [], options = {}) {
  const iterations = options.iterations ?? 500;
  const handSize = options.handSize ?? 7;
  const minUnits = options.minUnits ?? 1;
  const maxCostForEarly = options.maxCostForEarly ?? 2;
  const minEarlyCards = options.minEarlyCards ?? 1;
  const rng = options.rng ?? Math.random;

  const pool = explodeCards(deckCards);
  let keepable = 0;

  for (let i = 0; i < iterations; i++) {
    const hand = drawWithoutReplacement(pool, handSize, rng);
    const unitCount = hand.filter((c) => c.type === 'unit').length;
    const earlyCount = hand.filter((c) => Number.isFinite(c.cost) && c.cost <= maxCostForEarly).length;

    const isKeepable = unitCount >= minUnits && earlyCount >= minEarlyCards;
    if (isKeepable) keepable++;
  }

  return {
    iterations,
    keepable,
    keepRate: iterations ? keepable / iterations : 0,
    criteria: { minUnits, minEarlyCards, maxCostForEarly, handSize },
  };
}


export function computeKeepQualityIndex(deckCards = [], options = {}) {
  const global = simulateOpeningHands(deckCards, options.globalHandOptions || {});
  const opponentProfiles = options.opponentProfiles || {
    aggro: { minUnits: 2, minEarlyCards: 2, maxCostForEarly: 2 },
    midrange: { minUnits: 1, minEarlyCards: 2, maxCostForEarly: 3 },
    control: { minUnits: 1, minEarlyCards: 1, maxCostForEarly: 2 },
    tempo: { minUnits: 1, minEarlyCards: 2, maxCostForEarly: 2 },
  };

  const byOpponentArchetype = Object.entries(opponentProfiles).map(([archetype, profile]) => {
    const sim = simulateOpeningHands(deckCards, {
      ...(options.globalHandOptions || {}),
      ...profile,
    });
    return {
      opponentArchetype: archetype,
      keepRate: sim.keepRate,
      criteria: sim.criteria,
    };
  });

  const averageKeepRate = byOpponentArchetype.length
    ? byOpponentArchetype.reduce((acc, row) => acc + row.keepRate, 0) / byOpponentArchetype.length
    : global.keepRate;

  return {
    keepRateGlobal: global.keepRate,
    keepRateByOpponentArchetype: byOpponentArchetype,
    keepRateAverageVsArchetypes: averageKeepRate,
  };
}

export function computeDeadDrawRisk(deckCards = [], options = {}) {
  const iterations = options.iterations ?? 500;
  const openingHandSize = options.openingHandSize ?? 7;
  const turns = options.turns ?? [1, 2, 3, 4];
  const rng = options.rng ?? Math.random;

  const pool = explodeCards(deckCards);
  const risksByTurn = [];

  for (const turn of turns) {
    const drawsSeen = openingHandSize + Math.max(0, turn - 1);
    let deadCount = 0;

    for (let i = 0; i < iterations; i++) {
      const seen = drawWithoutReplacement(pool, drawsSeen, rng);
      const hasPlayable = seen.some((c) => Number.isFinite(c.cost) && c.cost <= turn);
      if (!hasPlayable) deadCount += 1;
    }

    risksByTurn.push({
      turn,
      deadDrawRisk: iterations ? deadCount / iterations : 0,
    });
  }

  const avgRisk = risksByTurn.length
    ? risksByTurn.reduce((acc, r) => acc + r.deadDrawRisk, 0) / risksByTurn.length
    : 0;

  return {
    turns: risksByTurn,
    averageDeadDrawRisk: avgRisk,
  };
}

export function computeRedundancyScore(deckCards = [], options = {}) {
  const roleTags = options.roleTags || ['starter', 'engine', 'payoff', 'interaction', 'removal', 'draw', 'ramp', 'finisher'];
  const total = sumQty(deckCards) || 1;

  const roleStats = roleTags.map((tag) => {
    const cards = deckCards.filter((c) => (c.tags || []).map(normalizeTag).includes(normalizeTag(tag)));
    const copies = cards.reduce((acc, c) => acc + (c.qty || 0), 0);
    const unique = cards.length;
    const roleScore = Math.min(1, unique / 3) * 0.5 + Math.min(1, copies / 8) * 0.5;
    return { tag: normalizeTag(tag), uniqueCards: unique, copies, roleScore };
  });

  const activeRoles = roleStats.filter((r) => r.copies > 0);
  const averageRoleScore = activeRoles.length
    ? activeRoles.reduce((acc, r) => acc + r.roleScore, 0) / activeRoles.length
    : 0;

  const maxCardCopies = deckCards.reduce((m, c) => Math.max(m, c.qty || 0), 0);
  const singleCardDependency = maxCardCopies / total;
  const penalty = Math.min(0.25, Math.max(0, singleCardDependency - 0.15));
  const score = Math.max(0, Math.round((averageRoleScore * (1 - penalty)) * 100));

  return {
    score,
    averageRoleScore,
    singleCardDependency,
    roleStats,
  };
}


export function computePlanAReliability(deckCards = [], options = {}) {
  const targetTurn = options.targetTurn ?? 3;
  const openingHandSize = options.openingHandSize ?? 7;
  const packageCardIds = options.planAPackageCardIds || [];
  const draws = openingHandSize + Math.max(0, targetTurn - 1);
  const hit = computePackageProbabilities(deckCards, packageCardIds, draws);

  return {
    targetTurn,
    draws,
    packageCardIds,
    probability: hit.atLeastOne,
    copies: hit.packageCopies,
    explain: `P(Plan A by T${targetTurn})=${(hit.atLeastOne * 100).toFixed(1)}%`,
  };
}

export function computePlanBFallback(deckCards = [], options = {}) {
  const iterations = options.iterations ?? 500;
  const targetTurn = options.targetTurn ?? 4;
  const openingHandSize = options.openingHandSize ?? 7;
  const planA = new Set(options.planAPackageCardIds || []);
  const planB = new Set(options.planBPackageCardIds || []);
  const draws = openingHandSize + Math.max(0, targetTurn - 1);
  const pool = explodeCards(deckCards);
  const rng = options.rng ?? Math.random;

  let aHit = 0;
  let bFallback = 0;

  for (let i = 0; i < iterations; i++) {
    const seen = drawWithoutReplacement(pool, draws, rng);
    const hasA = seen.some((c) => planA.has(c.id));
    const hasB = seen.some((c) => planB.has(c.id));
    if (hasA) aHit += 1;
    if (!hasA && hasB) bFallback += 1;
  }

  return {
    targetTurn,
    draws,
    planAPackageCardIds: [...planA],
    planBPackageCardIds: [...planB],
    pPlanA: iterations ? aHit / iterations : 0,
    pPlanBIfAWhiffs: iterations ? bFallback / iterations : 0,
    explain: `P(Plan B | A whiff by T${targetTurn})≈${((iterations ? bFallback / iterations : 0) * 100).toFixed(1)}%`,
  };
}

export function computeTensionScore(deckCards = [], options = {}) {
  const conflicts = detectInternalConflicts(deckCards, options.conflictOptions || {});
  const archetype = normalizeArchetype(options.archetype || '');
  const profile = (options.archetypeProfiles || DEFAULT_ARCHETYPE_PROFILES)[archetype] || null;

  const total = sumQty(deckCards) || 1;
  const expensiveQty = deckCards
    .filter((c) => Number.isFinite(c.cost) && c.cost >= (options.expensiveCostThreshold ?? 5))
    .reduce((acc, c) => acc + (c.qty || 0), 0);
  const expensiveRatio = expensiveQty / total;

  const targetLowCurve = profile?.targetLowCurveRatio ?? 0.4;
  const targetExpensive = Math.max(0.1, 1 - targetLowCurve - 0.2);
  const speedClash = Math.max(0, expensiveRatio - targetExpensive);

  const conflictPenalty = Math.min(0.6, conflicts.alerts.length * 0.15);
  const speedPenalty = Math.min(0.6, speedClash * 2);
  const score = Math.max(0, Math.round((1 - Math.min(1, conflictPenalty + speedPenalty)) * 100));

  return {
    score,
    conflictCount: conflicts.alerts.length,
    expensiveRatio,
    speedClash,
    markers: [
      `conflicts=${conflicts.alerts.length}`,
      `expensiveRatio=${(expensiveRatio * 100).toFixed(1)}%`,
      `speedClash=${(speedClash * 100).toFixed(1)}%`,
    ],
    explain: conflicts.alerts.length
      ? 'Tension élevée: conflits internes et/ou clash de vitesse détectés.'
      : 'Tension faible: plan de jeu cohérent avec la vitesse cible.',
  };
}

export function compareDeckVersions(prevCards = [], nextCards = []) {
  const prev = new Map(prevCards.map((c) => [c.id, c.qty || 0]));
  const next = new Map(nextCards.map((c) => [c.id, c.qty || 0]));
  const cardIds = new Set([...prev.keys(), ...next.keys()]);

  const changes = [];
  for (const id of cardIds) {
    const before = prev.get(id) || 0;
    const after = next.get(id) || 0;
    if (before !== after) changes.push({ id, before, after, delta: after - before });
  }

  return {
    changes: changes.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)),
    added: changes.filter((c) => c.delta > 0),
    removed: changes.filter((c) => c.delta < 0),
  };
}

export function detectInternalConflicts(deckCards = [], options = {}) {
  const alerts = [];
  const total = sumQty(deckCards) || 1;
  const expensiveQty = deckCards
    .filter((c) => Number.isFinite(c.cost) && c.cost >= (options.expensiveCostThreshold ?? 5))
    .reduce((acc, c) => acc + (c.qty || 0), 0);
  const expensiveRatio = expensiveQty / total;

  if (expensiveRatio > (options.maxExpensiveRatio ?? 0.33)) {
    alerts.push({
      code: 'HIGH_TOP_END',
      severity: 'warning',
      message: `High expensive-card ratio (${(expensiveRatio * 100).toFixed(1)}%).`,
    });
  }

  const hiddenSpells = deckCards
    .filter((c) => c.type === 'spell' && normalizeTag(c.subtype) === 'hidden')
    .reduce((acc, c) => acc + (c.qty || 0), 0);
  const hiddenRatio = hiddenSpells / total;
  if (hiddenRatio > (options.maxHiddenRatio ?? 0.25)) {
    alerts.push({
      code: 'HIGH_HIDDEN_RATIO',
      severity: 'warning',
      message: `High hidden spell density (${(hiddenRatio * 100).toFixed(1)}%).`,
    });
  }

  const situationalQty = deckCards
    .filter((c) => (c.tags || []).map(normalizeTag).includes('situational'))
    .reduce((acc, c) => acc + (c.qty || 0), 0);
  const situationalRatio = situationalQty / total;
  if (situationalRatio > (options.maxSituationalRatio ?? 0.3)) {
    alerts.push({
      code: 'TOO_MANY_SITUATIONAL',
      severity: 'warning',
      message: `Too many situational cards (${(situationalRatio * 100).toFixed(1)}%).`,
    });
  }

  return { alerts, metrics: { expensiveRatio, hiddenRatio, situationalRatio } };
}

export function buildSynergyRulesFromVeteranClaims(claims = [], options = {}) {
  const minConfidenceWeight = options.minConfidenceWeight ?? 0.5;
  const defaultMinCopies = options.defaultMinCopies ?? 2;

  return claims
    .map((claim, index) => {
      const confidence = normalizeTag(claim.confidence || 'low');
      const confidenceWeight = confidenceToWeight(confidence);
      if (confidenceWeight < minConfidenceWeight) return null;

      const requiredTags = parseTagList(claim.suggested_tags || claim.tags || claim.topic_tags);
      if (!requiredTags.length) return null;

      const minCopies = Number.isFinite(claim.minCopies) ? claim.minCopies : defaultMinCopies;
      return {
        name: claim.topic || claim.source_name || `claim_${index + 1}`,
        requiredTags,
        minCopies,
        confidence,
        confidenceWeight,
        source: claim.source_name || claim.source_type || 'veteran_claim',
        claim: claim.claim || '',
      };
    })
    .filter(Boolean);
}

export function detectSynergyCandidates(deckCards = [], rules = []) {
  const normalizedDeck = deckCards.map((card) => ({
    ...card,
    _tags: (card.tags || []).map(normalizeTag),
  }));

  const results = [];
  for (const rule of rules) {
    const requiredTags = (rule.requiredTags || []).map(normalizeTag);
    const minCopies = rule.minCopies ?? 1;

    let copiesMatching = 0;
    for (const card of normalizedDeck) {
      const matches = requiredTags.every((t) => card._tags.includes(t));
      if (matches) copiesMatching += card.qty || 0;
    }

    const isActive = copiesMatching >= minCopies;
    const confidenceWeight = confidenceToWeight(rule.confidence || rule.confidenceWeight);
    const coverageRatio = minCopies > 0 ? Math.min(1, copiesMatching / minCopies) : 1;
    const weightedScore = Number((coverageRatio * confidenceWeight).toFixed(4));

    results.push({
      name: rule.name,
      isActive,
      copiesMatching,
      minCopies,
      confidence: rule.confidence ?? 'heuristic',
      confidenceWeight,
      weightedScore,
      source: rule.source,
      claim: rule.claim,
      explain: isActive
        ? `Synergy active: ${copiesMatching} copies >= ${minCopies}.`
        : `Synergy not active: ${copiesMatching} copies < ${minCopies}.`,
    });
  }

  return results.sort((a, b) => b.weightedScore - a.weightedScore);
}

export function suggestCutsAdds(deckCards = [], cardPool = [], options = {}) {
  const minEarlyTarget = options.minEarlyTarget ?? 14;
  const maxExpensiveTarget = options.maxExpensiveTarget ?? 10;

  const earlyQty = deckCards
    .filter((c) => Number.isFinite(c.cost) && c.cost <= 2)
    .reduce((a, c) => a + (c.qty || 0), 0);
  const expensiveQty = deckCards
    .filter((c) => Number.isFinite(c.cost) && c.cost >= 5)
    .reduce((a, c) => a + (c.qty || 0), 0);

  const currentById = new Map(deckCards.map((c) => [c.id, c]));
  const cuts = [];
  const adds = [];

  if (expensiveQty > maxExpensiveTarget) {
    const expensiveCards = deckCards
      .filter((c) => Number.isFinite(c.cost) && c.cost >= 5)
      .sort((a, b) => (b.qty || 0) - (a.qty || 0));
    if (expensiveCards[0]) {
      cuts.push({ id: expensiveCards[0].id, reason: 'Reduce expensive top-end density.' });
    }
  }

  if (earlyQty < minEarlyTarget) {
    const candidate = cardPool.find(
      (c) => !currentById.has(c.id) && Number.isFinite(c.cost) && c.cost <= 2,
    );
    if (candidate) {
      adds.push({ id: candidate.id, reason: 'Increase early-game consistency.' });
    }
  }

  return {
    cuts,
    adds,
    metrics: { earlyQty, expensiveQty, minEarlyTarget, maxExpensiveTarget },
    explain: 'Heuristic suggestions only (hypothèse à valider par archetype/meta).',
  };
}

export function buildMatchupMatrix(matchResults = [], options = {}) {
  const byVersionVsArchetype = new Map();
  const byArchetype = new Map();
  const byDeckVersion = new Map();

  for (const m of matchResults) {
    const versionId = m.deckVersionId || 'unknown';
    const opp = m.opponentArchetype || 'unknown';

    const key = `${versionId}::${opp}`;
    const current = byVersionVsArchetype.get(key) || {
      deckVersionId: versionId,
      opponentArchetype: opp,
      wins: 0,
      losses: 0,
      draws: 0,
      total: 0,
    };

    if (m.result === 'win') current.wins += 1;
    else if (m.result === 'loss') current.losses += 1;
    else current.draws += 1;
    current.total += 1;
    byVersionVsArchetype.set(key, current);

    const arch = byArchetype.get(opp) || { opponentArchetype: opp, wins: 0, losses: 0, draws: 0, total: 0 };
    if (m.result === 'win') arch.wins += 1;
    else if (m.result === 'loss') arch.losses += 1;
    else arch.draws += 1;
    arch.total += 1;
    byArchetype.set(opp, arch);

    const ver = byDeckVersion.get(versionId) || { deckVersionId: versionId, wins: 0, losses: 0, draws: 0, total: 0 };
    if (m.result === 'win') ver.wins += 1;
    else if (m.result === 'loss') ver.losses += 1;
    else ver.draws += 1;
    ver.total += 1;
    byDeckVersion.set(versionId, ver);
  }

  const sampleSizeThreshold = options.sampleSizeThreshold ?? 12;
  const confidencePenalty = options.confidencePenalty ?? 0.2;
  const calibrate = (row) => {
    const winrate = row.total ? row.wins / row.total : 0;
    const sampleConfidence = Math.min(1, row.total / Math.max(1, sampleSizeThreshold));
    const confidencePenaltyApplied = confidencePenalty * (1 - sampleConfidence);
    const calibratedWinrate = Math.max(0, winrate * (1 - confidencePenaltyApplied));
    return {
      ...row,
      winrate,
      calibratedWinrate,
      sampleConfidence,
      confidencePenaltyApplied,
    };
  };

  const rows = Array.from(byVersionVsArchetype.values())
    .map(calibrate)
    .sort((a, b) => b.total - a.total);

  if (!options.extended) return rows;

  const archetypeStats = Array.from(byArchetype.values())
    .map(calibrate)
    .sort((a, b) => b.total - a.total);

  const versionStats = Array.from(byDeckVersion.values())
    .map(calibrate)
    .sort((a, b) => b.total - a.total);

  const totalMatches = rows.reduce((acc, r) => acc + r.total, 0);
  const sampleConfidenceGlobal = Math.min(1, totalMatches / Math.max(1, sampleSizeThreshold));

  return {
    rows,
    archetypeStats,
    versionStats,
    meta: {
      totalMatches,
      uniqueOppArchetypes: archetypeStats.length,
      uniqueDeckVersions: versionStats.length,
      sampleSizeThreshold,
      confidencePenalty,
      sampleConfidenceGlobal,
    },
  };
}

export function computeCoherenceScore(deckCards = [], options = {}) {
  const profileKey = normalizeArchetype(options.archetype || '');
  const profiles = options.archetypeProfiles || DEFAULT_ARCHETYPE_PROFILES;
  const profile = profiles[profileKey] || null;

  const targetUnitRatio = profile?.targetUnitRatio ?? options.targetUnitRatio ?? 0.45;
  const targetLowCurveRatio = profile?.targetLowCurveRatio ?? options.targetLowCurveRatio ?? 0.4;

  const total = sumQty(deckCards) || 1;
  const units = deckCards.filter((c) => c.type === 'unit').reduce((a, c) => a + (c.qty || 0), 0);
  const lowCurve = deckCards
    .filter((c) => Number.isFinite(c.cost) && c.cost <= 2)
    .reduce((a, c) => a + (c.qty || 0), 0);

  const unitRatio = units / total;
  const lowCurveRatio = lowCurve / total;

  const unitSubscore = Math.max(0, 1 - Math.abs(unitRatio - targetUnitRatio) / targetUnitRatio);
  const curveSubscore = Math.max(0, 1 - Math.abs(lowCurveRatio - targetLowCurveRatio) / targetLowCurveRatio);

  const score = Math.round((unitSubscore * 0.5 + curveSubscore * 0.5) * 100);

  return {
    score,
    profileUsed: profileKey && profile ? profileKey : null,
    targets: { unit: targetUnitRatio, lowCurve: targetLowCurveRatio },
    subscores: {
      unitBalance: Math.round(unitSubscore * 100),
      lowCurveBalance: Math.round(curveSubscore * 100),
    },
    explain: [
      `Unit ratio=${unitRatio.toFixed(2)} (target=${targetUnitRatio.toFixed(2)})`,
      `Low curve ratio=${lowCurveRatio.toFixed(2)} (target=${targetLowCurveRatio.toFixed(2)})`,
      'Hypothèse à valider: les cibles de ratio selon archétype Riftbound.',
    ],
  };
}


export function computeLayeredDeckMarkers(context = {}) {
  const legality = context.legality || { isValid: false, errors: [] };
  const coherence = context.coherence || { score: 0, subscores: {} };
  const openingHands = context.openingHands || { keepRate: 0 };
  const keepQuality = context.keepQuality || { keepRateGlobal: openingHands.keepRate || 0, keepRateAverageVsArchetypes: openingHands.keepRate || 0 };
  const deadDrawRisk = context.deadDrawRisk || { averageDeadDrawRisk: 0 };
  const redundancy = context.redundancy || { score: 0, singleCardDependency: 0 };
  const planGame = context.planGame || { planAReliability: { probability: 0 }, planBFallback: { pPlanBIfAWhiffs: 0 }, tension: { score: 0 } };
  const probabilities = context.probabilities || [];
  const synergies = context.synergies || [];
  const matchupInsights = context.matchupInsights || { meta: { totalMatches: 0 }, archetypeStats: [] };
  const conflicts = context.conflicts || { alerts: [] };

  const structurePenalty = Math.min(1, (legality.errors || []).length / 3);
  const structuralScore = legality.isValid ? 100 : Math.max(0, Math.round((1 - structurePenalty) * 100));

  const packageAvg = probabilities.length
    ? probabilities.reduce((acc, p) => acc + (p.atLeastOne || 0), 0) / probabilities.length
    : 0;
  const consistencyScore = Math.round(
    (coherence.subscores?.lowCurveBalance || 0) * 0.25 +
      (keepQuality.keepRateGlobal || 0) * 100 * 0.2 +
      (keepQuality.keepRateAverageVsArchetypes || 0) * 100 * 0.2 +
      packageAvg * 100 * 0.2 +
      (1 - (deadDrawRisk.averageDeadDrawRisk || 0)) * 100 * 0.15,
  );

  const activeSynergies = synergies.filter((s) => s.isActive);
  const activeSynergyWeighted = synergies.length
    ? synergies.reduce((acc, s) => acc + (s.isActive ? s.weightedScore || 0 : 0), 0) / synergies.length
    : 0;
  const strategicScore = Math.round((coherence.score || 0) * 0.6 + activeSynergyWeighted * 100 * 0.4);

  const totalMatches = matchupInsights.meta?.totalMatches || 0;
  const archetypeWinrate = (matchupInsights.archetypeStats || []).length
    ? (matchupInsights.archetypeStats || []).reduce((acc, r) => acc + (r.winrate || 0), 0) /
      matchupInsights.archetypeStats.length
    : 0;
  const sampleFactor = Math.min(1, totalMatches / 30);
  const conflictPenalty = Math.min(0.25, (conflicts.alerts || []).length * 0.05);
  const metaResilienceScore = Math.max(0, Math.round(((archetypeWinrate * sampleFactor) * 100) * (1 - conflictPenalty)));

  return {
    structuralValidity: {
      score: structuralScore,
      status: legality.isValid ? 'ok' : 'needs_fix',
      markers: [
        `isValid=${String(legality.isValid)}`,
        `errors=${(legality.errors || []).length}`,
      ],
    },
    intrinsicStability: {
      score: consistencyScore,
      status: consistencyScore >= 70 ? 'stable' : consistencyScore >= 50 ? 'medium' : 'unstable',
      markers: [
        `keepRateGlobal=${((keepQuality.keepRateGlobal || 0) * 100).toFixed(1)}%`,
        `keepRateVsArchetypes=${((keepQuality.keepRateAverageVsArchetypes || 0) * 100).toFixed(1)}%`,
        `avgPackageHit=${(packageAvg * 100).toFixed(1)}%`,
        `lowCurveSubscore=${coherence.subscores?.lowCurveBalance || 0}`,
        `deadDrawRiskAvg=${((deadDrawRisk.averageDeadDrawRisk || 0) * 100).toFixed(1)}%`,
      ],
    },
    strategicCoherence: {
      score: Math.round(strategicScore * 0.6 + (redundancy.score || 0) * 0.2 + (planGame.tension?.score || 0) * 0.2),
      status: strategicScore >= 70 ? 'aligned' : strategicScore >= 50 ? 'partial' : 'misaligned',
      markers: [
        `coherence=${coherence.score || 0}`,
        `activeSynergies=${activeSynergies.length}/${synergies.length}`,
        `profile=${coherence.profileUsed || 'none'}`,
        `redundancyScore=${redundancy.score || 0}`,
        `singleCardDependency=${(redundancy.singleCardDependency || 0).toFixed(2)}`,
        `planA=${((planGame.planAReliability?.probability || 0) * 100).toFixed(1)}%`,
        `planBIfAWhiffs=${((planGame.planBFallback?.pPlanBIfAWhiffs || 0) * 100).toFixed(1)}%`,
        `tensionScore=${planGame.tension?.score || 0}`,
      ],
    },
    metaResilience: {
      score: metaResilienceScore,
      status: totalMatches >= 10 ? 'data_backed' : 'low_sample',
      markers: [
        `matches=${totalMatches}`,
        `avgArchetypeWR=${(archetypeWinrate * 100).toFixed(1)}%`,
        `conflicts=${(conflicts.alerts || []).length}`,
      ],
    },
  };
}

export function computeDecisionQualityScore(context = {}) {
  const layeredMarkers = context.layeredMarkers || computeLayeredDeckMarkers(context);
  const veteranRules = context.veteranRules || [];
  const recommendationReasons = context.recommendationReasons || [];
  const matchupInsights = context.matchupInsights || { meta: { totalMatches: 0 } };

  const sourceConfidenceAvg = veteranRules.length
    ? veteranRules.reduce((acc, rule) => acc + (rule.confidenceWeight || confidenceToWeight(rule.confidence)), 0) / veteranRules.length
    : 0.5;
  const totalMatches = matchupInsights.meta?.totalMatches || 0;
  const volumeSignals = veteranRules.length + recommendationReasons.length + (totalMatches / 10);
  const volumeFactor = Math.min(1, volumeSignals / 12);

  const recommendationConfidenceScore = Math.round((sourceConfidenceAvg * 0.65 + volumeFactor * 0.35) * 100);
  const recommendationConfidence = {
    score: recommendationConfidenceScore,
    status: recommendationConfidenceScore >= 70 ? 'high' : recommendationConfidenceScore >= 45 ? 'medium' : 'low',
    markers: [
      `sourceConfidenceAvg=${(sourceConfidenceAvg * 100).toFixed(1)}%`,
      `volumeSignals=${volumeSignals.toFixed(2)}`,
      `volumeFactor=${(volumeFactor * 100).toFixed(1)}%`,
    ],
  };

  const components = {
    structuralIntegrity: layeredMarkers.structuralValidity,
    consistency: layeredMarkers.intrinsicStability,
    strategicCoherence: layeredMarkers.strategicCoherence,
    metaEvidence: layeredMarkers.metaResilience,
    recommendationConfidence,
  };

  const weights = {
    structuralIntegrity: 0.2,
    consistency: 0.25,
    strategicCoherence: 0.25,
    metaEvidence: 0.15,
    recommendationConfidence: 0.15,
  };

  const score = Math.round(
    components.structuralIntegrity.score * weights.structuralIntegrity +
      components.consistency.score * weights.consistency +
      components.strategicCoherence.score * weights.strategicCoherence +
      components.metaEvidence.score * weights.metaEvidence +
      components.recommendationConfidence.score * weights.recommendationConfidence,
  );

  return {
    score,
    weights,
    components,
  };
}

export function runFullAnalysis(input) {
  const deck = input?.deck || {};
  const cards = deck.cards || [];
  const { mainDeckCards, battlefieldCards } = splitDeckByBattlefield(cards);
  const veteranRules = buildSynergyRulesFromVeteranClaims(input?.veteranClaims || [], input?.veteranRuleOptions || {});
  const manualRules = input?.synergyRules || [];
  const synergyRules = [...manualRules, ...veteranRules];

  const legality = validateDeckRiftbound(deck, input?.legendChampionMap || {});
  const curve = computeCurve(mainDeckCards);
  const types = computeTypeDistribution(mainDeckCards);
  const subtypes = computeSubtypeDistribution(mainDeckCards);
  const coherence = computeCoherenceScore(mainDeckCards, {
    ...(input?.coherenceOptions || {}),
    archetype: input?.archetype || deck?.archetype,
    archetypeProfiles: input?.archetypeProfiles,
  });
  const conflicts = detectInternalConflicts(mainDeckCards, input?.conflictOptions || {});
  const synergies = detectSynergyCandidates(mainDeckCards, synergyRules);
  const probabilities = computeMultiPackageProbabilities(mainDeckCards, input?.packages || [], input?.draws ?? 8);
  const openingHands = simulateOpeningHands(mainDeckCards, input?.handOptions || {});
  const keepQuality = computeKeepQualityIndex(mainDeckCards, input?.keepQualityOptions || {});
  const deadDrawRisk = computeDeadDrawRisk(mainDeckCards, input?.deadDrawOptions || {});
  const redundancy = computeRedundancyScore(mainDeckCards, input?.redundancyOptions || {});
  const planAReliability = computePlanAReliability(mainDeckCards, input?.planAOptions || {});
  const planBFallback = computePlanBFallback(mainDeckCards, input?.planBOptions || {});
  const tension = computeTensionScore(mainDeckCards, {
    archetype: input?.archetype || deck?.archetype,
    archetypeProfiles: input?.archetypeProfiles,
    conflictOptions: input?.conflictOptions || {},
  });
  const planGame = { planAReliability, planBFallback, tension };
  const matchupInsights = buildMatchupMatrix(input?.matchResults || [], { extended: true });

  const layeredMarkers = computeLayeredDeckMarkers({
    legality,
    coherence,
    openingHands,
    keepQuality,
    deadDrawRisk,
    redundancy,
    planGame,
    probabilities,
    synergies,
    matchupInsights,
    conflicts,
  });

  const decisionQualityScore = computeDecisionQualityScore({
    layeredMarkers,
    veteranRules,
    recommendationReasons: synergies,
    matchupInsights,
  });

  return {
    legality,
    curve,
    types,
    subtypes,
    battlefield: {
      selectedId: deck?.battlefieldId || battlefieldCards[0]?.id || null,
      cards: battlefieldCards,
      count: sumQty(battlefieldCards),
    },
    coherence,
    conflicts,
    synergies,
    probabilities,
    openingHands,
    keepQuality,
    deadDrawRisk,
    redundancy,
    planGame,
    matchupInsights,
    layeredMarkers,
    decisionQualityScore,
    rules: {
      sourceName: RIFTBOUND_RULES_SNAPSHOT.source?.name || 'Unknown source',
      sourceUrl: RIFTBOUND_RULES_SNAPSHOT.source?.url || null,
      sourceStatus: RIFTBOUND_RULES_SNAPSHOT.source?.status || 'unknown',
      sourceVersion: RIFTBOUND_RULES_SNAPSHOT.source?.version || 'unknown',
      sourcePublishedAt: RIFTBOUND_RULES_SNAPSHOT.source?.publishedAt || 'unknown',
      sourceLastCheckedAt: RIFTBOUND_RULES_SNAPSHOT.source?.lastCheckedAt || 'unknown',
      assumptionsToValidate: RIFTBOUND_RULES_SNAPSHOT.assumptionsToValidate || [],
      nonBlockingNotes: RIFTBOUND_RULES_SNAPSHOT.nonBlockingNotes || [],
    },
  };
}
