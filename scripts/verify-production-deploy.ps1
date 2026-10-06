# Production deploy smoke check — delegates to scripts/verify-production-pages.mjs
#
# Usage:
#   .\scripts\verify-production-deploy.ps1
#   .\scripts\verify-production-deploy.ps1 -Poll -Attempts 24 -IntervalSeconds 15

param(
  [switch]$Poll,
  [int]$Attempts = 24,
  [int]$IntervalSeconds = 15
)

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$nodeArgs = @("$scriptRoot\verify-production-pages.mjs")

if ($Poll) {
  $nodeArgs += "--poll"
  $nodeArgs += "--attempts"
  $nodeArgs += "$Attempts"
  $nodeArgs += "--interval-ms"
  $nodeArgs += "$($IntervalSeconds * 1000)"
}

& node @nodeArgs
exit $LASTEXITCODE
