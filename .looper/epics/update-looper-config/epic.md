# Epic: Update Looper Config

Update the HUD project to align with the latest lab/looper framework specifications by migrating legacy skill paths and configuration files to their native plugin format.

## [M1] Update Looper Configuration
- **Purpose**: Rename `LOOPER.md` to `AGENTS.md` and update its contents to reference the new namespaced `looper` plugin paths (e.g., `/looper:tdd`).
- **Dependencies**: None
- **Validator**: `test -f AGENTS.md && ! test -f LOOPER.md && grep -q "/looper:tdd" AGENTS.md`
- **Status**: DONE
