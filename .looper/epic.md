# Epic: Antigravity HUD

A TypeScript Node.js CLI plugin for the Antigravity CLI that renders a real-time status-line showing agent state, context usage, quota limits, conversation ID, and running subagent count.

## [M1] Setup Project Infrastructure
- **Purpose**: Initialize a Node.js project with TypeScript, vitest, eslint, and esbuild.
- **Dependencies**: None
- **Validator**: `npm run test`
- **Status**: DONE

## [M2] Implement Input Parser
- **Purpose**: Read and parse the incoming Antigravity JSON payload from stdin to extract required metrics.
- **Dependencies**: [M1]
- **Validator**: `npm run test` (with tests mocking stdin)
- **Status**: DONE

## [M3] Implement System & Subagent Probes
- **Purpose**: Build modules to probe the local system (e.g., active subagent processes, HTTP requests to local AGY server).
- **Dependencies**: [M1]
- **Validator**: `npm run test` (with network/process mocks)
- **Status**: DONE

## [M4] Build Status Line Renderer
- **Purpose**: Format the gathered metrics into a styled, single-line terminal string.
- **Dependencies**: [M2], [M3]
- **Validator**: `npm run test` (testing string output format)
- **Status**: DONE

## [M5] Finalize Plugin Integration
- **Purpose**: Create plugin.json and the shell hook script to integrate with Antigravity.
- **Dependencies**: [M4]
- **Validator**: End-to-end local test (`agy plugin install .` and visual verification)
- **Status**: DONE
