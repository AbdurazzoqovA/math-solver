# Google Play launch assets

Run `node tool/generate_play_store_assets.mjs` from `mobile_app/` after any approved source-brand or screenshot change.

- `app-icon-512.png`: the owner-approved light-blue calculator icon.
- `feature-graphic-1024x500.png`: Play feature graphic using the shipped brand and approved Home screenshot.
- `phone-screenshots/`: the five approved `screenshots/final` exports with only 54 px copied edge padding on each side. This preserves the complete artwork while meeting Google Play's maximum 2:1 dimension ratio at 1398×2796.
- `listing-en-US.md`: source-of-truth Play listing copy and verified classification fields.

These assets do not authorize publishing or a production rollout. The owner must inspect the complete Play Console record and explicitly approve any release action.
