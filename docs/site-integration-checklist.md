# Checklist avant branchement site

## 1) Data
- [ ] `data/sources/spiritforged_top64_template.csv` rempli avec historique majors vérifiés (Bologna, Las Vegas, Chine mars 2026).
- [x] `data/sources/veteran_discussions_template.csv` maintenu avec volume solide de claims fiables.

## 2) Qualité
- [x] Script qualité disponible: `python scripts/check_research_quality.py --enforce`.
- [ ] CI en mode **production** (cibles strictes) au vert.
- [x] Tant que l'échantillon est faible, mode premium conservateur activé côté adapter.

## 3) Règles
- [ ] `analysis-engine/rulesConfig.js` passé de `provisional` à version officielle.
- [ ] `publishedAt` officiel renseigné.
- [ ] Plus de zones "hypothèse à valider" bloquantes.

## 4) Contrat d'intégration
- [x] Payload entrant/sortant documenté.
- [x] Visibilité mode Light vs Premium fixée.

## 5) Pilotage produit
- [x] KPI go-live définis.
- [ ] Instrumentation analytics branchée dans le site.
