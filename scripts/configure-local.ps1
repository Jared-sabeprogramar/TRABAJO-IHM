$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Push-Location $projectRoot
try {
  $statusJson = cmd.exe /c ".\frontend\node_modules\.bin\supabase.cmd status -o json 2>nul"
  if ($LASTEXITCODE -ne 0) { throw 'Inicia Supabase local primero.' }
  $status = $statusJson | ConvertFrom-Json
  if (-not $status.API_URL -or -not $status.ANON_KEY) { throw 'No se encontro la configuracion local.' }
  $config = @{ supabaseUrl=$status.API_URL; supabaseAnonKey=$status.ANON_KEY }
  $configPath = Join-Path $projectRoot 'frontend/src/assets/config.local.json'
  if (Test-Path $configPath) {
    $previous = Get-Content -Raw $configPath | ConvertFrom-Json
    $config.googleMapsApiKey = $previous.googleMapsApiKey
    $config.googleMapsMapId = $previous.googleMapsMapId
  }
  [System.IO.File]::WriteAllText($configPath, ($config | ConvertTo-Json), (New-Object System.Text.UTF8Encoding($false)))
  $secretPath = Join-Path $projectRoot 'supabase/.env.local'
  if (-not (Test-Path $secretPath)) {
    $bytes = New-Object byte[] 32
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $rng.GetBytes($bytes)
    $rng.Dispose()
    $secret = [Convert]::ToBase64String($bytes)
    [System.IO.File]::WriteAllText($secretPath, "DNI_HMAC_SECRET=$secret`nALLOWED_ORIGINS=http://localhost:4200,http://127.0.0.1:4200`n", (New-Object System.Text.UTF8Encoding($false)))
  }
  Write-Output 'Supabase local conectado. Configuracion local ignorada por Git; secreto privado conservado.'
} finally { Pop-Location }
