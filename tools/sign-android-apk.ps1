param(
    [Parameter(Mandatory = $true)][string]$InputApk,
    [Parameter(Mandatory = $true)][string]$OutputApk,
    [Parameter(Mandatory = $true)][string]$BuildTools
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$signingRoot = Join-Path $projectRoot '.android-signing.local'
$keystore = Join-Path $signingRoot 'qqorvex-release.jks'
$credentials = Join-Path $signingRoot 'credentials.clixml'
$sourceApk = (Resolve-Path -LiteralPath $InputApk).Path
$destinationApk = [IO.Path]::GetFullPath($OutputApk)
if ($sourceApk -eq $destinationApk) { throw 'Use um caminho de saída diferente do APK original.' }
$javaBin = Join-Path $env:JAVA_HOME 'bin'
$zipalign = Join-Path $BuildTools 'zipalign.exe'
$apksigner = Join-Path $BuildTools 'lib/apksigner.jar'
foreach ($requiredFile in @($zipalign, $apksigner, (Join-Path $javaBin 'keytool.exe'), (Join-Path $javaBin 'java.exe'))) {
    if (!(Test-Path -LiteralPath $requiredFile)) { throw "Ferramenta não encontrada: $requiredFile" }
}

if (!(Test-Path -LiteralPath $keystore)) {
    if (Test-Path -LiteralPath $credentials) { throw 'Credenciais existentes sem keystore. Restaure o backup antes de continuar.' }
    New-Item -ItemType Directory -Path $signingRoot -Force | Out-Null
    $passwordBytes = [byte[]]::new(32)
    [Security.Cryptography.RandomNumberGenerator]::Fill($passwordBytes)
    $securePassword = ConvertTo-SecureString ([Convert]::ToBase64String($passwordBytes)) -AsPlainText -Force
    [PSCredential]::new('qqorvex', $securePassword) | Export-Clixml -LiteralPath $credentials
}
if (!(Test-Path -LiteralPath $credentials)) { throw 'Restaure as credenciais da chave de assinatura.' }
$credential = Import-Clixml -LiteralPath $credentials
$env:QQORVEX_APK_KEY_PASSWORD = $credential.GetNetworkCredential().Password
try {
    if (!(Test-Path -LiteralPath $keystore)) {
        & (Join-Path $javaBin 'keytool.exe') -genkeypair -keystore $keystore -storetype JKS -alias qqorvex -keyalg RSA -keysize 2048 -validity 10000 -dname 'CN=Qqorvex, O=Qqorvex, C=BR' -storepass:env QQORVEX_APK_KEY_PASSWORD -keypass:env QQORVEX_APK_KEY_PASSWORD
        if ($LASTEXITCODE -ne 0) { throw 'Falha ao gerar a chave de assinatura.' }
    }
    New-Item -ItemType Directory -Path (Split-Path -Parent $destinationApk) -Force | Out-Null
    & $zipalign -f -P 16 4 $sourceApk $destinationApk
    if ($LASTEXITCODE -ne 0) { throw 'Falha no alinhamento do APK.' }
    & (Join-Path $javaBin 'java.exe') -jar $apksigner sign --ks $keystore --ks-key-alias qqorvex --ks-pass env:QQORVEX_APK_KEY_PASSWORD --key-pass env:QQORVEX_APK_KEY_PASSWORD $destinationApk
    if ($LASTEXITCODE -ne 0) { throw 'Falha na assinatura do APK.' }
    & (Join-Path $javaBin 'java.exe') -jar $apksigner verify --verbose --print-certs $destinationApk
    if ($LASTEXITCODE -ne 0) { throw 'Assinatura do APK inválida.' }
    Get-FileHash -LiteralPath $destinationApk -Algorithm SHA256
} finally {
    Remove-Item Env:QQORVEX_APK_KEY_PASSWORD -ErrorAction SilentlyContinue
}
