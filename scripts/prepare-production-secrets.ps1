param([string]$SiteOrigin = 'https://trabajo-ihm.rondoypereziker.workers.dev')
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$origin = [Uri]$SiteOrigin
if ($origin.Scheme -ne 'https' -or $origin.AbsolutePath -ne '/') { throw 'Usa el origen HTTPS del sitio, sin rutas.' }
function Read-DotEnv([string]$Path) {
  $values = @{}
  if (Test-Path -LiteralPath $Path) {
    foreach ($line in Get-Content -LiteralPath $Path) {
      if ($line -match '^\s*([A-Z_]+)\s*=\s*(.*?)\s*$') { $values[$Matches[1]] = $Matches[2].Trim([char]34, [char]39) }
    }
  }
  return $values
}
$source = Read-DotEnv (Join-Path $root 'supabase/.env.local')
$target = Join-Path $root 'supabase/.env.production.local'
$production = Read-DotEnv $target
foreach ($name in @('GEMINI_API_KEY','GEMINI_CHAT_MODEL','GEMINI_VISION_MODEL')) {
  if (-not $production[$name]) { $production[$name] = $source[$name] }
  if (-not $production[$name]) { throw "Falta $name en la configuracion privada." }
}
if (-not $production['DNI_HMAC_SECRET']) {
  $bytes = New-Object byte[] 32
  $random = [Security.Cryptography.RandomNumberGenerator]::Create()
  try { $random.GetBytes($bytes) } finally { $random.Dispose() }
  $production['DNI_HMAC_SECRET'] = [Convert]::ToBase64String($bytes)
}
$production['ALLOWED_ORIGINS'] = $origin.GetLeftPart([UriPartial]::Authority)
$names = @('DNI_HMAC_SECRET','ALLOWED_ORIGINS','GEMINI_API_KEY','GEMINI_CHAT_MODEL','GEMINI_VISION_MODEL')
$lines = $names | ForEach-Object { "$_=$($production[$_])" }
[IO.File]::WriteAllText($target, (($lines -join "`n") + "`n"), (New-Object Text.UTF8Encoding($false)))
Write-Output 'Archivo privado de produccion preparado. No se muestran claves; todavia no se ha desplegado.'
