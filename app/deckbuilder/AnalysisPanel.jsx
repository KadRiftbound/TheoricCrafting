import React, { useMemo, useState } from 'react';
import { analyzeDeckForUI } from './analysisAdapter.js';

/**
 * Drop-in analysis panel for deck builder pages.
 *
 * Props:
 * - deck: { legendId, chosenChampionId, battlefieldId?, cards, archetype? }
 * - previousDeckCards: array of previous version cards for comparison
 * - legendChampionMap: Record<legendId, championId>
 * - synergyRules: [{ name, requiredTags, minCopies }]
 * - veteranClaims: [{ topic, claim, confidence, suggested_tags }]
 * - packages: [{ name, cardIds }]
 * - matchResults: [{ deckVersionId, opponentArchetype, result }]
 */
export default function AnalysisPanel({
  deck,
  previousDeckCards = null,
  legendChampionMap,
  synergyRules = [],
  veteranClaims = [],
  packages = [],
  matchResults = [],
}) {
  const [mode, setMode] = useState('compact');

  const analysis = useMemo(
    () =>
      analyzeDeckForUI({
        deck,
        previousDeckCards,
        legendChampionMap,
        synergyRules,
        veteranClaims,
        packages,
        matchResults,
        archetype: deck?.archetype,
      }),
    [deck, previousDeckCards, legendChampionMap, synergyRules, veteranClaims, packages, matchResults],
  );

  const isExpert = mode === 'expert';

  return (
    <section style={{ border: '1px solid #333', borderRadius: 8, padding: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>Analyse</h3>
        <div>
          <button
            type="button"
            onClick={() => setMode('compact')}
            style={{ marginRight: 8, fontWeight: !isExpert ? 'bold' : 'normal' }}
          >
            Mode compact
          </button>
          <button type="button" onClick={() => setMode('expert')} style={{ fontWeight: isExpert ? 'bold' : 'normal' }}>
            Mode expert
          </button>
        </div>
      </div>

      <p>
        <strong>Légalité:</strong> {analysis.summary.isLegal ? 'OK' : 'Erreurs'}
      </p>
      <p>
        <strong>Rules badge:</strong> {analysis.summary.rulesSourceStatus} · v{analysis.summary.rulesSourceVersion} · published {analysis.summary.rulesPublishedAt}
      </p>
      {!analysis.summary.isLegal && (
        <ul>
          {analysis.legality.errors.map((err) => (
            <li key={err}>{err}</li>
          ))}
        </ul>
      )}

      <p>
        <strong>Score cohérence:</strong> {analysis.summary.score}/100
      </p>
      <p>
        <strong>Keep rate (simu):</strong> {(analysis.summary.keepRate * 100).toFixed(1)}%
      </p>
      <p>
        <strong>Synergies actives:</strong> {analysis.summary.activeSynergyCount}
      </p>

      {analysis.summary.profileUsed && (
        <p>
          <strong>Profil archétype:</strong> {analysis.summary.profileUsed}
        </p>
      )}

      {analysis.summary.matchupSampleSize > 0 && (
        <p>
          <strong>Échantillon matchup:</strong> {analysis.summary.matchupSampleSize} match(s)
        </p>
      )}


      <p>
        <strong>Battlefield:</strong> {analysis.summary.battlefieldId || 'non sélectionné'}
      </p>

      {analysis.summary.topAlerts.length > 0 && (
        <>
          <h4>Alertes</h4>
          <ul>
            {analysis.summary.topAlerts.map((a) => (
              <li key={a.code}>{a.message}</li>
            ))}
          </ul>
        </>
      )}



      <h4>Deck health</h4>
      <ul>
        <li>
          <strong>Keep Quality Index (global):</strong> {(analysis.summary.keepQualityGlobal * 100).toFixed(1)}%
        </li>
        <li>
          <strong>Keep Quality Index (vs archetypes):</strong> {(analysis.summary.keepQualityVsArchetypes * 100).toFixed(1)}%
        </li>
        <li>
          <strong>Dead Draw Risk (T1–T4):</strong> {(analysis.summary.deadDrawRiskAverage * 100).toFixed(1)}%
        </li>
        <li>
          <strong>Redundancy Score:</strong> {analysis.summary.redundancyScore}/100
        </li>
      </ul>

      <h4>Marqueurs (4 couches)</h4>
      <ul>
        <li>
          <strong>Validité structurelle:</strong> {analysis.layeredMarkers.structuralValidity.score}/100 ({analysis.layeredMarkers.structuralValidity.status})
        </li>
        <li>
          <strong>Stabilité intrinsèque:</strong> {analysis.layeredMarkers.intrinsicStability.score}/100 ({analysis.layeredMarkers.intrinsicStability.status})
        </li>
        <li>
          <strong>Cohérence stratégique:</strong> {analysis.layeredMarkers.strategicCoherence.score}/100 ({analysis.layeredMarkers.strategicCoherence.status})
        </li>
        <li>
          <strong>Résilience méta:</strong> {analysis.layeredMarkers.metaResilience.score}/100 ({analysis.layeredMarkers.metaResilience.status})
        </li>
      </ul>

      {analysis.decisionQualityScore && (
        <>
          <h4>Decision Quality Score</h4>
          <p>
            <strong>Global:</strong> {analysis.decisionQualityScore.score}/100
          </p>
          <ul>
            <li>
              <strong>Structural Integrity:</strong> {analysis.decisionQualityScore.components.structuralIntegrity.score}/100
            </li>
            <li>
              <strong>Consistency:</strong> {analysis.decisionQualityScore.components.consistency.score}/100
            </li>
            <li>
              <strong>Strategic Coherence:</strong> {analysis.decisionQualityScore.components.strategicCoherence.score}/100
            </li>
            <li>
              <strong>Meta Evidence:</strong> {analysis.decisionQualityScore.components.metaEvidence.score}/100
            </li>
            <li>
              <strong>Recommendation Confidence:</strong> {analysis.decisionQualityScore.components.recommendationConfidence.score}/100
            </li>
          </ul>
        </>
      )}


      <h4>Conseiller Deckbuilder</h4>
      <p><strong>Light:</strong> {analysis.advisor?.light?.recommendations?.length || 0} reco rapides</p>
      <p><strong>Premium:</strong> {analysis.advisor?.premium?.recommendations?.length || 0} reco détaillées</p>
      {analysis.advisor?.premium?.conservativeMode ? (
        <p><em>{analysis.advisor?.premium?.reason}</em></p>
      ) : null}

      <h4>Pourquoi cette recommandation ?</h4>
      <ul>
        {analysis.recommendationReasons.map((r) => (
          <li key={r.code}>
            [{r.type}] {r.reason}{' '}
            <em>confidence={(r.decisionConfidence?.score * 100 || 0).toFixed(1)}% ({r.decisionConfidence?.label || 'n/a'})</em>
          </li>
        ))}
      </ul>



      <h4>Evidence Cards</h4>
      {!analysis.evidenceCards?.length ? (
        <p>Aucune evidence card disponible.</p>
      ) : (
        <ul>
          {analysis.evidenceCards.map((card, idx) => (
            <li key={`${card.claim}-${idx}`}>
              <strong>{card.claim}</strong> — confidence {(card.confidenceScore * 100).toFixed(1)}%
              {isExpert ? (
                <>
                  <br />
                  <small>Engine: {card.becauseEngine}</small>
                  <br />
                  <small>Data: {card.becauseData}</small>
                  <br />
                  <small>Expected delta: {card.expectedDelta}</small>
                  <br />
                  <small>Risk: {card.counterRisk}</small>
                </>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {analysis.versionComparison && (
        <>
          <h4>Comparaison avec version précédente</h4>
          {analysis.versionComparison.changes.length === 0 ? (
            <p>Aucune différence détectée.</p>
          ) : (
            <ul>
              {analysis.versionComparison.changes.slice(0, 10).map((c) => (
                <li key={c.id}>
                  {c.id}: {c.before} → {c.after} ({c.delta > 0 ? '+' : ''}
                  {c.delta})
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <h4>Packages (probas)</h4>
      <ul>
        {analysis.probabilities.map((p) => (
          <li key={p.name}>
            {p.name}: {(p.atLeastOne * 100).toFixed(1)}% (au moins 1 en {p.draws} cartes)
          </li>
        ))}
      </ul>

      {isExpert && (
        <>
          <h4>Détails experts</h4>
          <p>
            <strong>Targets cohérence:</strong> unit={analysis.coherence.targets.unit}, lowCurve={analysis.coherence.targets.lowCurve}
          </p>
          <p>
            <strong>Subscores:</strong> unit={analysis.coherence.subscores.unitBalance}, lowCurve={analysis.coherence.subscores.lowCurveBalance}
          </p>

          <h5>Détails marqueurs (4 couches)</h5>
          <ul>
            {analysis.layeredMarkers.structuralValidity.markers.map((m) => (
              <li key={`struct-${m}`}>Structure: {m}</li>
            ))}
            {analysis.layeredMarkers.intrinsicStability.markers.map((m) => (
              <li key={`stab-${m}`}>Stabilité: {m}</li>
            ))}
            {analysis.layeredMarkers.strategicCoherence.markers.map((m) => (
              <li key={`strat-${m}`}>Stratégie: {m}</li>
            ))}
            {analysis.layeredMarkers.metaResilience.markers.map((m) => (
              <li key={`meta-${m}`}>Méta: {m}</li>
            ))}
          </ul>


          <h5>Deck health (détails)</h5>
          <ul>
            {(analysis.keepQuality.keepRateByOpponentArchetype || []).map((r) => (
              <li key={`kqi-${r.opponentArchetype}`}>
                Keep vs {r.opponentArchetype}: {(r.keepRate * 100).toFixed(1)}%
              </li>
            ))}
          </ul>
          <ul>
            {(analysis.deadDrawRisk.turns || []).map((r) => (
              <li key={`ddr-${r.turn}`}>
                Dead draw risk T{r.turn}: {(r.deadDrawRisk * 100).toFixed(1)}%
              </li>
            ))}
          </ul>
          <ul>
            {(analysis.redundancy.roleStats || []).filter((x) => x.copies > 0).map((r) => (
              <li key={`role-${r.tag}`}>
                {r.tag}: uniques={r.uniqueCards}, copies={r.copies}, roleScore={(r.roleScore * 100).toFixed(1)}%
              </li>
            ))}
          </ul>

          <h5>Synergies pondérées</h5>
          <ul>
            {analysis.synergies.slice(0, 10).map((s) => (
              <li key={`${s.name}-${s.minCopies}`}>
                {s.name} | active={String(s.isActive)} | confidence={s.confidence} | score={(s.weightedScore * 100).toFixed(1)}%
              </li>
            ))}
          </ul>

          <h5>Matchup par archétype (agrégé)</h5>
          <ul>
            {(analysis.matchupInsights.archetypeStats || []).slice(0, 10).map((m) => (
              <li key={m.opponentArchetype}>
                {m.opponentArchetype}: WR={(m.winrate * 100).toFixed(1)}% ({m.wins}-{m.losses}-{m.draws}, n={m.total})
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
