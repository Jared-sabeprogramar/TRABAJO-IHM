param(
  [ValidatePattern('^[a-z]{20}$')][string]$ProjectRef = 'hfnrmchqihiujdlobeqx',
  [switch]$DryRun
)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$cli = Join-Path $root 'frontend/node_modules/.bin/supabase.cmd'
$secrets = Join-Path $root 'supabase/.env.production.local'
if (-not (Test-Path -LiteralPath $secrets)) { throw 'Ejecuta scripts/prepare-production-secrets.ps1 primero.' }
function Invoke-Supabase([string[]]$Arguments) {
  & $cli @Arguments
  if ($LASTEXITCODE -ne 0) { throw 'Supabase no pudo completar la operacion. Revisa autenticacion y acceso al proyecto.' }
}
Push-Location $root
try {
  Invoke-Supabase -Arguments @('link','--project-ref',$ProjectRef)
  Invoke-Supabase -Arguments @('db','push','--linked','--dry-run')
  if ($DryRun) { Write-Output 'Plan revisado; no se aplicaron migraciones ni se publicaron funciones.'; return }
  Invoke-Supabase -Arguments @('db','push','--linked','--yes')
  $remoteJson = & $cli secrets list --project-ref $ProjectRef -o json
  if ($LASTEXITCODE -ne 0) { throw 'No se pudo revisar los secretos existentes; no se sobrescribira el secreto de identidades.' }
  $remote = $remoteJson | ConvertFrom-Json
  if ($remote.PSObject.Properties.Name -contains 'secrets') { $remote = $remote.secrets }
  $preserveIdentitySecret = @($remote | ForEach-Object { $_.name }) -contains 'DNI_HMAC_SECRET'
  $uploadFile = Join-Path $root ('supabase/.temp/production-secrets-' + [Guid]::NewGuid().ToString() + '.env')
  try {
    $lines = Get-Content -LiteralPath $secrets
    if ($preserveIdentitySecret) {
      $lines = $lines | Where-Object { $_ -notmatch '^DNI_HMAC_SECRET=' }
      Write-Output 'Se conserva el secreto de identidades que ya existe en produccion.'
    }
    [IO.File]::WriteAllText($uploadFile, (($lines -join "`n") + "`n"), (New-Object Text.UTF8Encoding($false)))
    Invoke-Supabase -Arguments @('secrets','set','--project-ref',$ProjectRef,'--env-file',$uploadFile)
  } finally { if (Test-Path -LiteralPath $uploadFile) { Remove-Item -LiteralPath $uploadFile } }
  foreach ($name in @('identify','submit-report','describe-image','assistant')) {
    Invoke-Supabase -Arguments @('functions','deploy',$name,'--project-ref',$ProjectRef,'--use-api')
  }
  Write-Output 'Migraciones y cuatro funciones desplegadas. Configura sesiones anonimas y URL publica en Auth antes de publicar el frontend.'
} finally { Pop-Location }
