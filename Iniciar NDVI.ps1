$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$ndviUrl = 'http://127.0.0.1:5173'
function Test-Ndvi {
    try {
        $ndviStatus = Invoke-RestMethod -Uri "$ndviUrl/api/status" -TimeoutSec 2
        return ($ndviStatus.localOnly -eq $true)
    } catch { return $false }
}
try {
    if (-not (Test-Ndvi)) {
        $ndviNode = (Get-Command node.exe -ErrorAction Stop).Source
        if (-not (Test-Path -LiteralPath (Join-Path $PSScriptRoot 'node_modules\express\index.js'))) {
            & npm.cmd install
            if ($LASTEXITCODE -ne 0) { throw 'Nao foi possivel instalar os componentes.' }
        }
        Start-Process -FilePath $ndviNode -ArgumentList 'server/index.js' -WorkingDirectory $PSScriptRoot -WindowStyle Hidden
        $ndviReady = $false
        for ($ndviAttempt = 0; $ndviAttempt -lt 15; $ndviAttempt++) {
            if (Test-Ndvi) { $ndviReady = $true; break }
            Start-Sleep -Milliseconds 500
        }
        if (-not $ndviReady) { throw 'A aplicacao nao iniciou na porta 5173. Verifique se ela esta ocupada.' }
    }
    Start-Process $ndviUrl
    Write-Host "NDVI aberto em $ndviUrl"
} catch {
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
