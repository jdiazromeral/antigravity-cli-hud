---
status: DONE
validator: npm run build && node scripts/sync_installed_plugin.js --test
---
# Mission M1: auto-sync-plugin-hook

- **Epic**: agy-future-readiness
- **Status**: DONE
- **Purpose**: Implement an automated build & sync utility in `scripts/sync_installed_plugin.js` and update `package.json` with `"sync"` script so running `npm run sync` compiles `dist/` and syncs files directly to `~/.gemini/config/plugins/hud/`.
- **Validator**: `npm run build && node scripts/sync_installed_plugin.js --test`
