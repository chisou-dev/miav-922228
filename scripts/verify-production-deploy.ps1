# Production deploy smoke check — follows apex → www (308) and other redirects.
# Redirect responses are not failures; only the final status code matters.
#
# Usage:
#   .\scripts\verify-production-deploy.ps1
#   .\scripts\verify-production-deploy.ps1 -Poll -Attempts 24 -IntervalSeconds 15

param(
  [string]$BaseUrl = "https://miav-922228.com",
  [string[]]$Paths = @("/", "/start-here", "/works", "/flash/after-the-rain"),
  [switch]$Poll,
  [int]$Attempts = 24,
  [int]$IntervalSeconds = 15
)

$RedirectStatuses = @(301, 302, 307, 308)
$MaxRedirects = 12

function Get-FinalHttpResult {
  param([string]$Url)

  $current = $Url
  for ($hop = 0; $hop -lt $MaxRedirects; $hop++) {
    try {
      $resp = Invoke-WebRequest -Uri $current -MaximumRedirection 0 -UseBasicParsing -TimeoutSec 45 -ErrorAction Stop
      $status = [int]$resp.StatusCode
      if ($RedirectStatuses -contains $status) {
        $location = $resp.Headers["Location"]
        if ([string]::IsNullOrWhiteSpace($location)) {
          throw "Redirect $status from $current without Location header"
        }
        $current = ([Uri]::new([Uri]$current, $location)).AbsoluteUri
        continue
      }
      return @{ Status = $status; Url = $current; Response = $resp }
    } catch {
      $web = $_.Exception.Response
      if ($null -eq $web) { throw }

      $status = [int]$web.StatusCode
      if ($RedirectStatuses -contains $status) {
        $location = $web.Headers["Location"]
        if ([string]::IsNullOrWhiteSpace($location)) {
          throw "Redirect $status from $current without Location header"
        }
        $current = ([Uri]::new([Uri]$current, $location)).AbsoluteUri
        continue
      }

      return @{ Status = $status; Url = $current; Response = $null }
    }
  }

  throw "Too many redirects from $Url"
}

function Test-ProductionPages {
  $allOk = $true
  foreach ($path in $Paths) {
    $target = "$BaseUrl$path"
    $result = Get-FinalHttpResult -Url $target
    Write-Host ("HTTP {0} {1} {2}" -f $path, $result.Status, $result.Url)
    if ($result.Status -ne 200) { $allOk = $false }
  }

  $homeResult = Get-FinalHttpResult -Url "$BaseUrl/"
  if ($homeResult.Status -eq 200 -and $null -ne $homeResult.Response) {
    $hasStartHere = $homeResult.Response.Content -like '*href="/start-here"*'
    Write-Host ("home_has_start_here {0}" -f $hasStartHere)
    if (-not $hasStartHere) { $allOk = $false }
  } else {
    $allOk = $false
  }

  return $allOk
}

$maxAttempts = if ($Poll) { $Attempts } else { 1 }

for ($i = 1; $i -le $maxAttempts; $i++) {
  $ok = Test-ProductionPages
  if ($ok) {
    Write-Output "OK production pages verified"
    exit 0
  }
  if ($i -lt $maxAttempts) {
    Write-Output "Waiting deploy (attempt $i/$maxAttempts)…"
    Start-Sleep -Seconds $IntervalSeconds
  }
}

Write-Error "FAIL production verification"
exit 1
