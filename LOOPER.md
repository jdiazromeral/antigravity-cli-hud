# Looper / Agent Instructions for HUD Project

When working on this project (`antigravity-cli-hud`), all automated agents and subagents MUST adhere to the following project-specific rules:

1. **Test-Driven Development (TDD)**: You MUST use the TDD approach for all feature additions and bug fixes. Write failing tests first, verify they fail, write the minimum code to make them pass, and then refactor. 
   *(Hint: You can activate and use the `~/.gemini/skills/tdd` skill to help enforce this loop).*

2. **Strict TypeScript**: This is a strict TypeScript project. Avoid using `any` and explicitly type all payloads and interfaces.

3. **Validation**: The ultimate validator for any mission in this repository is `npm run test` (Vitest).

4. **Formatting**: All output strings meant for the terminal HUD MUST be visually styled and utilize Nerd Font icons.
