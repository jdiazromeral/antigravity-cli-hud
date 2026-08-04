# Epic: HUD Optimizations

Implement power-user optimizations for the HUD plugin, including telemetry blocks and token budget ledger.

## [M1] Inject Telemetry Blocks
- **Purpose**: Modify src/formatter.ts to add the version and plan blocks to the large layout array.
- **Dependencies**: None
- **Validator**: `npm run build && npm run test`
- **Status**: BLOCKED

## [M2] Activate Token Ledger
- **Purpose**: Create or update ~/.gemini/config/hooks.json to register scripts/token_eval_hook.py for PreInvocation and Stop events.
- **Dependencies**: None
- **Validator**: `cat ~/.gemini/config/hooks.json | grep -q "token_eval_hook.py"`
- **Status**: PENDING

## [M3] Personalize Agent Tag
- **Purpose**: Append export AGY_AGENT_NAME="Javi" to ~/.zshrc if it doesn't already exist.
- **Dependencies**: None
- **Validator**: `grep -q "AGY_AGENT_NAME" ~/.zshrc`
- **Status**: PENDING
