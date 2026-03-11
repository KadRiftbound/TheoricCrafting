import { runFullAnalysis, compareDeckVersions, buildMatchupMatrix } from '../../analysis-engine/riftboundAnalysis.js';

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function confidenceLabel(score) {
  if (score >= 0.75) return 'high';
  if (score >= 0.55) return 'medium';
  return 'low';
}

function buildDecisionConfidence({ baseScore, sampleConfidence = 0.5, source = 'heuristic' }) {
  const score = clamp01(baseScore * (0.75 + 0.25 * sampleConfidence));
  return {
    score,
    label: confidenceLabel(score),
    source,
    sampleConfidence,
    strength: score >= 0.75 ? 'strong' : score >= 0.55 ? 'medium' : 'weak',
  };
}

function applyConfidenceGate(reasons = [], gate = {}) {
  const minStrongScore = gate.minStrongScore ?? 0.75;
  const minStrongSample = gate.minStrongSample ?? 0.35;

  return reasons.map((reason) => {
    const dc = reason.decisionConfidence || { score: 0, sampleConfidence: 0, strength: 'weak' };
    const gatedStrong = dc.score >= minStrongScore && (dc.sampleConfidence ?? 0) >= minStrongSample;
    const strength = dc.strength === 'strong' && !gatedStrong ? 'medium' : dc.strength;

    return {
      ...reason,
      impactScore: clamp01((reason.baseImpact || 0.4) * (dc.score || 0)),
      decisionConfidence: {
        ...dc,
        strength,
        gateApplied: dc.strength === 'strong' ? !gatedStrong : false,
      },
    };
  });
}


function buildAdvisorTiers({ recommendationReasons = [], evidenceCards = [], policy = {} }) {
  const premiumMinMatchSample = policy.premiumMinMatchSample ?? 20;
  const matchupSampleSize = policy.matchupSampleSize ?? 0;
  const premiumConservative = matchupSampleSize < premiumMinMatchSample;

  const ranked = [...recommendationReasons].sort((a, b) => (b.impactScore || 0) - (a.impactScore || 0));
  const light = ranked.slice(0, 3).map((r) => ({
    code: r.code,
    type: r.type,
    reason: r.reason,
    confidence: r.decisionConfidence?.label || 'low',
    impactScore: r.impactScore || 0,
  }));

  const premium = ranked.slice(0, 8).map((r) => {
    const ev = evidenceCards.find((c) => (c.claim || '').toLowerCase().includes((r.code || '').toLowerCase().split('_')[0])) || evidenceCards[0] || null;
    return {
      code: r.code,
      type: r.type,
      reason: r.reason,
      confidence: r.decisionConfidence?.label || 'low',
      confidenceScore: r.decisionConfidence?.score || 0,
      impactScore: r.impactScore || 0,
      evidence: ev,
    };
  });

  return {
    light: {
      tier: 'light',
      recommendations: light,
    },
    premium: {
      tier: 'premium',
      conservativeMode: premiumConservative,
      reason: premiumConservative
        ? `Premium conservateur: sample matchup insuffisant (${matchupSampleSize}/${premiumMinMatchSample}).`
        : 'Premium actif: sample matchup suffisant.',
      recommendations: premiumConservative ? premium.slice(0, 2) : premium,
    },
  };
}

export function analyzeDeckForUI({
  deck,
  legendChampionMap,
  synergyRules = [],
  packages = [],
  handOptions = {},
  veteranClaims = [],
  matchResults = [],
  archetype,
  previousDeckCards = null,
  confidenceGate = {},
  advisorPolicy = {},
}) {
  const report = runFullAnalysis({
    deck,
    legendChampionMap,
    synergyRules,
    packages,
    handOptions,
    veteranClaims,
    matchResults,
    archetype,
  });

  const sampleConfidence = report.matchupInsights?.meta?.sampleConfidenceGlobal || 0.5;
  const topAlerts = (report.conflicts.alerts || []).slice(0, 3);
  const activeSynergies = (report.synergies || []).filter((s) => s.isActive);
  const topSynergies = [...(report.synergies || [])].sort((a, b) => b.weightedScore - a.weightedScore).slice(0, 3);

  const rawReasons = [
    ...topAlerts.map((a) => {
      const decisionConfidence = buildDecisionConfidence({
        baseScore: a.severity === 'warning' ? 0.72 : 0.5,
        sampleConfidence,
        source: 'conflict+matchups',
      });
      return {
        type: 'conflict',
        severity: a.severity || 'warning',
        code: a.code,
        reason: a.message,
        baseImpact: a.severity === 'warning' ? 0.9 : 0.55,
        decisionConfidence,
      };
    }),
    ...topSynergies.map((s) => {
      const decisionConfidence = buildDecisionConfidence({
        baseScore: 0.45 + (s.confidenceWeight || 0.5) * 0.5,
        sampleConfidence,
        source: 'synergy-rule',
      });
      return {
        type: 'synergy',
        severity: s.isActive ? 'info' : 'warning',
        code: `SYNERGY_${String(s.name).toUpperCase().replace(/\s+/g, '_')}`,
        reason: `${s.name} — ${s.explain} (confidence=${s.confidence}, score=${(s.weightedScore * 100).toFixed(1)}%)`,
        baseImpact: s.isActive ? 0.65 : 0.8,
        decisionConfidence,
      };
    }),
    ...(report.coherence.explain || []).map((line, i) => ({
      type: 'coherence',
      severity: 'info',
      code: `COHERENCE_${i + 1}`,
      reason: line,
      baseImpact: 0.5,
      decisionConfidence: buildDecisionConfidence({
        baseScore: 0.5,
        sampleConfidence,
        source: 'coherence-heuristic',
      }),
    })),
  ];

  const recommendationReasons = applyConfidenceGate(rawReasons, confidenceGate)
    .sort((a, b) => b.impactScore - a.impactScore)
    .slice(0, 8);

  const versionComparison = previousDeckCards ? compareDeckVersions(previousDeckCards, deck?.cards || []) : null;

  const evidenceCards = [
    ...topAlerts.map((a) => ({
      claim: `Réduire la tension liée à ${a.code}`,
      becauseEngine: a.message,
      becauseData: `Match sample: ${report.matchupInsights?.meta?.totalMatches || 0} match(s).`,
      confidence: a.severity === 'warning' ? 'medium' : 'low',
      confidenceScore: a.severity === 'warning' ? 0.7 : 0.4,
      expectedDelta: `Tension score +2 à +8 (hypothèse).`,
      counterRisk: 'Peut réduire certaines lignes greed/late game selon le matchup.',
    })),
    ...topSynergies.map((s) => ({
      claim: `Renforcer la synergie: ${s.name}`,
      becauseEngine: s.explain,
      becauseData: `Weighted synergy score ${(s.weightedScore * 100).toFixed(1)}%, confidence=${s.confidence}.`,
      confidence: s.confidence,
      confidenceScore: s.confidenceWeight || 0.5,
      expectedDelta: `Plan A reliability potentiellement en hausse (+1% à +5% selon package).`,
      counterRisk: 'Risque d’augmenter la redondance et de réduire la flexibilité.',
    })),
    {
      claim: 'Ajuster les slots pour améliorer la résilience méta',
      becauseEngine: `WR moyen agrégé: ${(((report.matchupInsights?.archetypeStats || []).reduce((a, r) => a + (r.calibratedWinrate || r.winrate || 0), 0) / Math.max(1, (report.matchupInsights?.archetypeStats || []).length)) * 100).toFixed(1)}%`,
      becauseData: `Total matches: ${report.matchupInsights?.meta?.totalMatches || 0}, sample confidence=${((report.matchupInsights?.meta?.sampleConfidenceGlobal || 0) * 100).toFixed(1)}%`,
      confidence: (report.matchupInsights?.meta?.totalMatches || 0) >= 20 ? 'high' : 'medium',
      confidenceScore: (report.matchupInsights?.meta?.totalMatches || 0) >= 20 ? 1 : 0.7,
      expectedDelta: 'Objectif: +1% à +3% WR sur archétypes fréquents.',
      counterRisk: 'Overfitting possible si le field change rapidement.',
    },
  ].slice(0, 6);

  return {
    ...report,
    versionComparison,
    recommendationReasons,
    evidenceCards,
    advisor: buildAdvisorTiers({
      recommendationReasons,
      evidenceCards,
      policy: {
        ...advisorPolicy,
        matchupSampleSize: report.matchupInsights?.meta?.totalMatches || 0,
      },
    }),
    summary: {
      isLegal: report.legality.isValid,
      score: report.coherence.score,
      topAlerts,
      activeSynergyCount: activeSynergies.length,
      keepRate: report.openingHands.keepRate,
      profileUsed: report.coherence.profileUsed,
      battlefieldId: report.battlefield?.selectedId || deck?.battlefieldId || null,
      matchupSampleSize: report.matchupInsights?.meta?.totalMatches || 0,
      recommendationCount: recommendationReasons.length,
      layeredMarkers: report.layeredMarkers,
      decisionQualityScore: report.decisionQualityScore,
      keepQualityGlobal: report.keepQuality?.keepRateGlobal || 0,
      keepQualityVsArchetypes: report.keepQuality?.keepRateAverageVsArchetypes || 0,
      deadDrawRiskAverage: report.deadDrawRisk?.averageDeadDrawRisk || 0,
      redundancyScore: report.redundancy?.score || 0,
      planASuccessByTargetTurn: report.planGame?.planAReliability?.probability || 0,
      planBFallbackIfAWhiffs: report.planGame?.planBFallback?.pPlanBIfAWhiffs || 0,
      tensionScore: report.planGame?.tension?.score || 0,
      rulesSourceStatus: report.rules?.sourceStatus || 'unknown',
      rulesSourceVersion: report.rules?.sourceVersion || 'unknown',
      rulesPublishedAt: report.rules?.sourcePublishedAt || 'unknown',
      rulesAssumptionsCount: (report.rules?.assumptionsToValidate || []).length,
    },
  };
}

export function compareDecksForUI(previousDeckCards, nextDeckCards) {
  return compareDeckVersions(previousDeckCards, nextDeckCards);
}

export function buildMatchupsForUI(matchResults, options = {}) {
  return buildMatchupMatrix(matchResults, options);
}
