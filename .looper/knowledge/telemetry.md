# Telemetry Gotchas

- **Execution Mode**: While modern Antigravity CLI clients stream the execution mode directly in the JSON payload, you must preserve the `settings.json` disk-read fallback. Older clients or specific CLI states may omit `mode` from the payload, and completely removing the fallback will break backward compatibility.
