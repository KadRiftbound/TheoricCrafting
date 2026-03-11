# Riftbound Official Rules Intake

## Source provided
- Official PDF URL: https://cmsassets.rgpub.io/sanity/files/dsfx7636/news_live/dbc96e31db9d0257b0791aafb6dbb0cd219d3efb.pdf
- Local status: **not downloaded automatically** in this environment (HTTP 403 on fetch).

## What is already stacked in the repo
- `analysis-engine/rulesConfig.js` contains a centralized `RIFTBOUND_RULES_SNAPSHOT` object.
- This snapshot is now consumed by `validateDeckRiftbound` so deck constraints are no longer hard-coded in multiple places.

## Confirmed constraints currently encoded (from product discussion)
- Main deck size: 39 cards.
- 1 legend required.
- 1 chosen champion required.
- 1 battlefield required.
- Max 1 battlefield card.
- Legend cannot be included in main deck.

## How to use the official PDF coherently (brainstorm-ready)
1. **Rules extraction pass**
   - Extract only deck-construction, setup, mulligan, and zone definitions.
   - Save these as machine-readable keys in `analysis-engine/rulesConfig.js`.
2. **Validation hardening**
   - Add any missing copy-limit rules by rarity/type.
   - Add champion/legend legality checks if the rules define stricter deck identity constraints.
3. **Analysis upgrades**
   - Use true mulligan wording for opening-hand simulations.
   - Use official timing/zone rules to improve dead-draw and plan-reliability markers.
4. **UI clarity**
   - Display “Rules source: official PDF version/date” next to legality panel.
   - Show warnings when a rule is still under `assumptionsToValidate`.

## Next practical step
If you can add the PDF file manually to `docs/rules/`, I can parse it and convert the exact rules text into structured fields, then remove remaining assumptions.
