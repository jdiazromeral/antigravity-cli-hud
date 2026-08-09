# Looper / Agent Instructions for HUD Project

When working on this project (`antigravity-cli-hud`), all automated agents and subagents MUST adhere to the following project-specific rules:

1. **Test-Driven Development (TDD)**: You MUST use the TDD approach for all feature additions and bug fixes. Write failing tests first, verify they fail, write the minimum code to make them pass, and then refactor. **You must commit the failing test separately from the implementation so the commit trail proves TDD was followed.**
   *(Hint: You can activate and use the `/looper:tdd` skill to help enforce this loop).*

2. **Strict TypeScript**: This is a strict TypeScript project. Avoid using `any` and explicitly type all payloads and interfaces.

3. **Validation**: The ultimate validator for any mission in this repository is `npm run test` (Vitest).

4. **Formatting**: All output strings meant for the terminal HUD MUST be visually styled and utilize Nerd Font icons.

5. **Mocking**: Never hardcode paths like os.homedir() in Vitest mocks. Dynamically insert the homedir into test cases using `path.join(os.homedir(), ...)` to prevent cross-environment test fragility. **Do not use hardcoded literal string placeholders like `/tmp/mock-homedir`.**

6. **Interface Updates**: When updating core interfaces like ParsedMetrics, you must update the corresponding mock data payloads across the entire test suite to prevent cascading TypeScript errors.

7. **Side-Effecting Validators**: NEVER write a custom Node.js validator script (e.g. `node -e "import(...)"`) that imports the plugin's main entry points (`index.ts` or `dist/index.js`). The HUD plugin attaches a persistent `process.stdin` listener that will cause the background validation task to hang indefinitely. Instead, use static code analysis (`grep`), or export configurations/logic into side-effect-free modules for validation.

8. **Zero-Disk I/O on Render Path**: NEVER perform synchronous multi-megabyte disk I/O (such as reading full transcript logs or recursively walking OS process trees with `ps`) on the real-time statusline render path. All telemetry metrics must be read directly from in-memory payload fields to maintain <2ms hook execution latency.

9. **Declarative Runtime Configuration**: NEVER require source-code modification or `esbuild` compilation for user layout customization. User preferences and matrix overrides must be loaded dynamically via `~/.gemini/hud_config.json` with safe fallback to `DEFAULT_HUD_CONFIG`.
