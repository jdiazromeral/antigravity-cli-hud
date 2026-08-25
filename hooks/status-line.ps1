$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding  = [System.Text.Encoding]::UTF8

# Fast 1-hop check if parent agy process has dangerously-skip-permissions flag
if (-not $env:AGY_SKIP_PERMISSIONS) {
    try {
        $parentPid = (Get-CimInstance Win32_Process -Filter "ProcessId = $PID" -ErrorAction SilentlyContinue).ParentProcessId
        if ($parentPid) {
            $cmdLine = (Get-CimInstance Win32_Process -Filter "ProcessId = $parentPid" -ErrorAction SilentlyContinue).CommandLine
            if ($cmdLine -match '(^|\s)--dangerously-skip-permissions(\s|$)') {
                $env:AGY_SKIP_PERMISSIONS = "true"
            }
        }
    } catch {
        # Silently ignore if CIM query is unavailable or restricted
    }
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$nodeScript = Join-Path $scriptDir "..\dist\index.js"

$input | node $nodeScript
