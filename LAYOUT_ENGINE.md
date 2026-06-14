# Dynamic HUD Matrix Engine

The Antigravity CLI HUD plugin uses a highly optimized, dynamically-rendered Matrix Engine to paint your status line. Rather than hardcoding terminal text strings, you can fully configure what information is displayed and exactly where it renders based on the width of your active terminal window.

## Configuration

To customize your HUD, open `src/formatter.ts` and locate the `HUD_CONFIG` object at the top of the file:

```typescript
export const HUD_CONFIG = {
  breakpoints: {
    large: 135,
    medium: 105,
    small: 0
  },
  layouts: {
    large: [
      ['state', 'model', 'sandbox', 'ctx', '5h', 'weekly'],
      ['workspace', 'tasks', 'subagents']
    ],
    // ...
  }
};
```

### 1. Breakpoints
Breakpoints define the terminal width (in columns/characters) at which a specific layout becomes active. The engine measures your live terminal width during streaming and automatically routes the display to the appropriate layout array. 
- `large`: Activates when `width >= 135`
- `medium`: Activates when `width >= 105`
- `small`: Activates when `width < 105`

### 2. Available Blocks
You can drag and drop these string keys into any layout array:
- `'state'`: (🟢 IDLE, 🔵 WORKING, etc.)
- `'model'`: The active AI model.
- `'sandbox'`: The sandbox security indicator.
- `'workspace'`: The current `$PWD` directory name.
- `'ctx'`: The token context window percentage.
- `'5h'`: The 5-hour rolling Gemini token quota.
- `'weekly'`: The weekly rolling Gemini token quota.
- `'tasks'`: The active background task count.
- `'subagents'`: The list of active subagents and their roles.
- `'version'`: The active Antigravity CLI version (e.g. 📦 v1.0.8).
- `'email'`: Your authenticated Google account email.
- `'plan'`: Your active billing tier (e.g. 💎 Google AI Pro).

### 3. Rules of the Matrix
- **Row Mapping**: Every sub-array you define inside a layout size becomes a physical horizontal row in the terminal. The engine automatically calculates and prepends the correct `┌─`, `├─`, and `└─` brackets.
- **Subagents Caveat**: Because subagents dynamically multiply and stretch to fill horizontal space, the `'subagents'` key behaves uniquely. If there are too many subagents to fit on the current row, it will automatically overflow and generate new rows beneath it. **Therefore, `'subagents'` should always be the LAST item inside its respective array.**

## Recompiling

After editing `HUD_CONFIG` inside `formatter.ts`, you must rebuild the plugin for changes to take effect:

```bash
cd antigravity-cli-hud
npm run build
agy plugin install .
```
