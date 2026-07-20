# Sync adminUid from Vercel production env and deploy Firestore rules only.
# Never prints UID values. Run from repo root.
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path (Join-Path $root "firestore.rules"))) { $root = (Get-Location).Path }
Set-Location $root

$pull = Join-Path $root ".env.vercel.production.pull"
if (Test-Path $pull) { Remove-Item $pull -Force }

Write-Output "step=vercel_env_pull_production"
& npx --yes vercel env pull $pull --environment=production --yes
if (-not (Test-Path $pull)) {
  Write-Output "result=pull_failed"
  exit 2
}

function Get-EnvVal([string]$path, [string]$key) {
  foreach ($line in Get-Content $path) {
    if ($line -match ("^\s*" + [regex]::Escape($key) + "=(.*)$")) {
      $v = $Matches[1].Trim()
      if (
        ($v.StartsWith('"') -and $v.EndsWith('"')) -or
        ($v.StartsWith("'") -and $v.EndsWith("'"))
      ) {
        $v = $v.Substring(1, $v.Length - 2).Trim()
      }
      if ($v) { return $v }
    }
  }
  return $null
}

$admin = Get-EnvVal $pull "ADMIN_UID"
$pub = Get-EnvVal $pull "NEXT_PUBLIC_ADMIN_UID"
$project = Get-EnvVal $pull "NEXT_PUBLIC_FIREBASE_PROJECT_ID"
$saRaw = Get-EnvVal $pull "FIREBASE_SERVICE_ACCOUNT_JSON"

function Resolve-ProjectId([string]$candidate, [string]$saRawValue) {
  $jsonText = $saRawValue
  if ($jsonText -and -not $jsonText.Trim().StartsWith("{")) {
    try {
      $decoded = [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($jsonText))
      if ($decoded.Trim().StartsWith("{")) { $jsonText = $decoded }
    } catch {}
  }
  if ($jsonText -and $jsonText.Trim().StartsWith("{")) {
    try {
      $obj = $jsonText | ConvertFrom-Json
      if ($obj.project_id) { return [string]$obj.project_id }
    } catch {}
  }
  if ($candidate) { return $candidate.ToLowerInvariant() }
  return $null
}

$project = Resolve-ProjectId $project $saRaw

Write-Output ("admin_set=" + [bool]$admin)
Write-Output ("pub_set=" + [bool]$pub)
Write-Output ("aligned=" + (($null -ne $admin) -and ($null -ne $pub) -and ($admin -eq $pub)))
Write-Output ("project_set=" + [bool]$project)
Write-Output ("sa_present=" + [bool]$saRaw)

if (-not $admin -or -not $pub -or ($admin -ne $pub)) {
  Remove-Item $pull -Force -ErrorAction SilentlyContinue
  Write-Output "result=uid_not_aligned_or_missing"
  exit 3
}
if (-not $project) {
  Remove-Item $pull -Force -ErrorAction SilentlyContinue
  Write-Output "result=project_id_missing"
  exit 4
}

$rulesPath = Join-Path $root "firestore.rules"
$rules = Get-Content $rulesPath -Raw
$pattern = "(function adminUid\(\) \{\r?\n\s*return ')([^']+)(';)"
$updated = [regex]::Replace($rules, $pattern, {
    param($m)
    return $m.Groups[1].Value + $admin + $m.Groups[3].Value
  }, 1)
if ($updated -eq $rules) {
  $updated = $rules.Replace("REPLACE_WITH_ADMIN_UID", $admin)
}
Set-Content -Path $rulesPath -Value $updated -NoNewline

$check = Get-Content $rulesPath -Raw
Write-Output ("rules_placeholder=" + $check.Contains("REPLACE_WITH_ADMIN_UID"))
Write-Output ("rules_trace_map_read_false=" + [bool]($check -match "match /trace_map/[\s\S]*?allow read: if false"))
Write-Output ("rules_trace_locations_locked=" + [bool]($check -match "match /trace_locations/[\s\S]*?allow read, write: if false"))

$rcObj = [ordered]@{ projects = [ordered]@{ default = $project } }
$rcObj | ConvertTo-Json | Set-Content -Path (Join-Path $root ".firebaserc") -Encoding utf8
Write-Output "firebaserc_written=true"

# Prefer service account from pulled env for non-interactive deploy
$credPath = $null
if ($saRaw) {
  $credPath = Join-Path $root ".firebase-sa.tmp.json"
  $jsonText = $saRaw
  if (-not $jsonText.Trim().StartsWith("{")) {
    try {
      $decoded = [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($jsonText))
      if ($decoded.Trim().StartsWith("{")) { $jsonText = $decoded }
    } catch {}
  }
  Set-Content -Path $credPath -Value $jsonText -Encoding utf8
  $env:GOOGLE_APPLICATION_CREDENTIALS = $credPath
  Write-Output "sa_cred_prepared=true"
} else {
  Write-Output "sa_cred_prepared=false"
}

Remove-Item $pull -Force -ErrorAction SilentlyContinue

Write-Output "step=firebase_deploy_rules"
& npx --yes firebase-tools deploy --only firestore:rules --project $project --non-interactive
$deployExit = $LASTEXITCODE
Write-Output ("deploy_exit=" + $deployExit)

if ($credPath -and (Test-Path $credPath)) {
  Remove-Item $credPath -Force -ErrorAction SilentlyContinue
  Remove-Item Env:GOOGLE_APPLICATION_CREDENTIALS -ErrorAction SilentlyContinue
}

Write-Output "step=post_checks"
$ov = Invoke-WebRequest -Uri "https://www.miav-922228.com/api/trace?view=overview" -UseBasicParsing -TimeoutSec 40
Write-Output ("overview_status=" + $ov.StatusCode)
$ovText = $ov.Content
Write-Output ("overview_has_uid_key=" + [bool]($ovText -match '"uid"\s*:'))

$counts = Invoke-WebRequest -Uri "https://www.miav-922228.com/api/trace?view=counts&country=Japan" -UseBasicParsing -TimeoutSec 40
Write-Output ("counts_status=" + $counts.StatusCode)

$locPath = Join-Path $root "public\locations\countries\JP.json"
if (Test-Path $locPath) {
  $jp = Get-Content $locPath -Raw | ConvertFrom-Json
  $lid = $jp.regions[0].cities[0].locationId
  $trUri = "https://www.miav-922228.com/api/trace?view=traces&locationId=$([uri]::EscapeDataString($lid))&limit=5"
  $tr = Invoke-WebRequest -Uri $trUri -UseBasicParsing -TimeoutSec 40
  Write-Output ("traces_status=" + $tr.StatusCode)
  $trText = $tr.Content
  Write-Output ("traces_has_uid_key=" + [bool]($trText -match '"uid"\s*:'))
  Write-Output ("traces_item_has_id_field=" + [bool]($trText -match '"traces"\s*:\s*\[[\s\S]*?"id"\s*:'))
  Write-Output ("traces_has_miavId=" + [bool]($trText -match '"miavId"'))
}

Write-Output ("result=" + $(if ($deployExit -eq 0) { "deploy_ok" } else { "deploy_failed" }))
exit $deployExit
