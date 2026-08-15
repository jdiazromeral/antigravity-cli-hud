**Performance Doctrine**: The parser module should always prioritize extracting data directly from the telemetry JSON payload (like the 'vcs' object) over executing synchronous OS shell operations (like child_process.execSync) to prevent blocking the Node event loop.

**Security & Isolation Doctrine**:
- All session identifiers (`conversation_id`, `session_id`) and `blockKey` properties must be validated via `isSafeIdentifier()` before being used in file paths or commands.
- Caches (`hud_looper_${conversationId}.cache`, `hud_git_${conversationId}.cache`) are strictly session-scoped.
- When `cwd` is a parent workspace directory, repo discovery must strictly consult the session's `hud_context.json`.
- `countTranscriptSteps` enforces a 2MB maximum read ceiling (`MAX_READ_BYTES`) on transcript files.
