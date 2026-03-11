# Outil de theorycraft Riftbound — cadrage produit/tech (version implémentation site)

## 1. Vision produit

### Direction retenue
Construire un **module d’analyse compétitif mais utilisable par tous** directement dans ton deck builder React, sans créer de homepage dédiée.

Le produit n’est pas un simple constructeur de liste :
- il donne un diagnostic de cohérence,
- il explique les forces/faiblesses d’une version,
- il aide à décider des cuts/adds en contexte tournoi.

### Proposition de valeur
- **Compétitif** : préparer un lineup/méta et optimiser vite.
- **Intermédiaire** : comprendre pourquoi une liste est instable.
- **Nouveau** : éviter les erreurs structurelles de build.

---

## 2. Contraintes Riftbound confirmées

> Données fournies par toi (considérées confirmées pour ce plan)

- Deck = **1 Légende + 1 Chosen Champ + 39 cartes**.
- La **Légende est hors deck** normal (ne peut pas être dans les 39).
- Le **Chosen Champ** est une unité normale portant le même nom que le champion.
- Tu peux fournir un **mapping Légende -> Chosen Champ**.
- Types connus : `gear`, `unit`, `spell` (`action`, `reaction`, `hidden`).
- Formats compétitifs : **les 3 existent**.
- Beaucoup de données tournoi existent en ligne + cartes déjà présentes sur ton site.

### Hypothèses à valider
- règles précises de mulligan par format,
- limites de copies par carte (si variables selon format),
- structure officielle exacte des sources de résultats tournoi (fiabilité + fréquence).

---

## 3. Problèmes utilisateurs (ciblage compétitif, sans exclure les autres)

### Joueur compétitif (priorité produit)
- Valider rapidement qu’une liste respecte les contraintes de format.
- Mesurer l’impact réel de chaque changement de slot.
- Préparer des ajustements ciblés contre méta observé.

### Joueur intermédiaire
- Comprendre les conflits internes (courbe, densité de réponses, mains mortes).
- Choisir entre 2 versions proches avec des métriques objectives.

### Nouveau joueur
- Recevoir des alertes structurantes (ratio types, courbe, dépendance trop forte à une carte).

### Créateur/analyste
- Exporter des snapshots d’analyse et expliquer les choix à son audience.

---

## 4. Fonctions d’analyse utiles (sans moteur de règles complet)

1. **Deck Legality Guard**
- But : vérifier instantanément `1 légende + 1 chosen champ + 39`.
- Données : deck list + mapping champion.
- Faisable sans moteur complet : **oui**.

2. **Curve & Type Balance**
- But : détecter saturation de coûts/roles.
- Données : coûts + types + sous-types de spells.
- Faisable sans moteur complet : **oui**.

3. **Opening Hand Consistency**
- But : estimer fréquence de mains jouables.
- Données : deck, critères keep, mulligan.
- Faisable sans moteur complet : **oui**.

4. **Package Hit Probability (tour N)**
- But : % de toucher un package (ex: interaction early + payoff).
- Données : packages taggés, pioche cumulée.
- Faisable sans moteur complet : **oui**.

5. **Internal Conflict Detector**
- But : repérer anti-synergies structurelles (trop de cartes situationnelles, coûts en collision).
- Données : tags + coûts + catégories.
- Faisable sans moteur complet : **oui**.

6. **Version Diff Impact**
- But : lier chaque diff à un impact analytique (stabilité, courbe, probas).
- Données : deck_versions + snapshots.
- Faisable sans moteur complet : **oui**.

7. **Matchup Note Layer (empirique)**
- But : relier version du deck aux résultats tournoi/ladder.
- Données : résultats externes + tags archétypes.
- Faisable sans moteur complet : **oui** (data-driven).

---

## 5. MVP recommandé (module intégré au deck builder)

### Scope MVP (7 features)
1. **Legality panel Riftbound** (bloquant)  
2. **Curve & distribution panel** (coût + types + spell subtypes)  
3. **Opening hand simulator** (batch + filtres keep)  
4. **Probability lab** (cartes/packages au tour N)  
5. **Coherence score explicable** (sous-scores activables)  
6. **Version compare** (diff + impact)  
7. **Share snapshot** (lien d’analyse configurable)

### Pourquoi ce MVP
- répond à ton objectif “compétitif mais pour tous”,
- s’intègre dans ton React actuel,
- ne dépend pas d’une API externe au départ,
- permet d’activer/désactiver le niveau de détail dans l’UI.

---

## 6. Data model initial (simple + extensible)

### `cards`
- `id`, `name`, `type`, `subtype`, `cost`, `text`, `tags[]`, `is_champion_candidate`, `is_legend`

### `legend_champion_map`
- `legend_card_id`, `chosen_champion_card_id`, `status`, `source`

### `decks`
- `id`, `user_id`, `name`, `format`, `legend_card_id`, `chosen_champion_card_id`, `created_at`

### `deck_versions`
- `id`, `deck_id`, `version_number`, `cards_json`, `notes`, `analysis_snapshot_json`, `created_at`

### `analysis_profiles`
- `id`, `user_id`, `name`, `verbosity_level`, `show_advanced_insights`, `weights_json`

### `matchup_records`
- `id`, `deck_version_id`, `opponent_archetype`, `event_name`, `round`, `result`, `source_url`, `played_at`

### `tournament_events`
- `id`, `name`, `format`, `date`, `source_url`, `ingested_at`

---

## 7. Architecture technique (pragmatique pour ton contexte)

### Front-end
- **React (intégré)** + TypeScript.
- Module UI “Theorycraft” monté dans l’écran deck builder.
- Visualisations : Recharts (ou lib déjà utilisée sur le site).

### Back-end
- Si pas d’API prête : démarrer en **mode local module + endpoints minimes**.
- Dès que possible : API dédiée “analysis” (Node/TS) pour centraliser scoring et snapshots.

### Base de données
- Conserver ta base actuelle.
- Ajouter tables minimales : `deck_versions`, `legend_champion_map`, `analysis_profiles`, `matchup_records`.

### Analysis engine
- Package TS isolé (`/analysis-engine`) avec fonctions pures :
  - `validateDeckRiftbound()`
  - `computeCurve()`
  - `simulateOpeningHands()`
  - `computePackageProbabilities()`
  - `computeCoherenceScore()`
  - `compareDeckVersions()`

### Ingestion data
- Source cartes : ton site (source primaire).
- Source tournoi : connecteurs externes (ETL périodique) + pipeline de normalisation.

---

## 8. UX/UI intégré au deck builder

### Clarification de la question “écran central”
Question reformulée clairement :
> **Dans ton deck builder actuel, quelle colonne/panneau doit afficher les insights en priorité : à droite, en bas, ou en onglet séparé ?**

### Recommandation par défaut
- Ajouter un **onglet “Analyse”** dans la page deck.
- Dans cet onglet :
  - haut : score + légalité + alertes critiques,
  - milieu : courbe + distribution,
  - bas : probas + simulateur + recommandations.
- Bouton constant : **“Comparer avec version précédente”**.
- Toggle : **“Mode détaillé”** pour afficher/masquer les justifications ultra détaillées.

---

## 9. Roadmap réaliste

### Phase 0 (1 semaine) — cadrage implémentation
Livrables :
- mapping légende/champion initial,
- schéma JSON de deck unifié,
- critères keep de base (version v0).

Risque :
- qualité hétérogène des données externes tournoi.

### MVP (4 à 6 semaines)
Livrables :
- legality panel,
- courbe + types,
- probas + simulateur mains,
- score cohérence explicable,
- comparaison de versions,
- snapshot partageable.

Risque :
- surcharge UI si trop d’insights d’un coup.

### V2 (4 à 8 semaines)
Livrables :
- connecteur résultats tournoi,
- matchup board empirique,
- suggestions cuts/adds basées sur objectifs.

Risque :
- faux positifs des recommandations automatiques.

### V3
Livrables :
- assistant conversationnel branché sur tes données,
- benchmark méta communautaire.

---

## 10. Recommandation finale

### Meilleure vision produit
Un **assistant d’optimisation compétitif intégré** à ton deck builder React.

### Meilleur MVP
Le combo : **légalité + cohérence + probas + comparaison de versions + partage**.

### Meilleure architecture
**Module React intégré + engine TypeScript découplé + stockage versions + ETL tournoi**.

### 5 prochaines actions concrètes
1. Me transmettre le mapping `Légende -> Chosen Champ` (même partiel).  
2. Geler le format JSON de deck (incluant légende/champion/39).  
3. Implémenter `validateDeckRiftbound()` et l’afficher en live dans le builder.  
4. Implémenter `computeCurve()` + `computePackageProbabilities()` avec UI minimale.  
5. Ajouter `deck_versions` + écran compare avant toute logique matchup avancée.
