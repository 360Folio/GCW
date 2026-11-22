# Builds a zip of the source code for uploading to Hostinger's Node.js app
# deploy. Hostinger installs packages and builds on its side, so the zip
# leaves out node_modules, build output, git data and every .env file.
#
# Usage (from the project folder):  .\scripts\package-release.ps1

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$stamp = Get-Date -Format 'yyyyMMdd-HHmm'
$outDir = Join-Path $root 'release'
$zip = Join-Path $outDir "gcw-$stamp.zip"
$staging = Join-Path ([IO.Path]::GetTempPath()) "gcw-release-$stamp"

$exclude = @('node_modules', '.next', '.git', 'release', 'coverage')

New-Item -ItemType Directory -Force $outDir, $staging | Out-Null
try {
    Get-ChildItem -LiteralPath $root -Force |
        Where-Object { $exclude -notcontains $_.Name -and $_.Name -notlike '.env*' } |
        Copy-Item -Destination $staging -Recurse -Force

    # Keep the template, which documents the variables to set in hPanel.
    Copy-Item (Join-Path $root '.env.example') $staging -Force

    # Safety check: no real secrets in the upload.
    $leaks = Get-ChildItem -LiteralPath $staging -Recurse -Force -File |
        Where-Object { $_.Name -like '.env*' -and $_.Name -ne '.env.example' }
    if ($leaks) { throw "Refusing to package: found $($leaks.FullName -join ', ')" }

    Compress-Archive -Path (Join-Path $staging '*') -DestinationPath $zip -Force
    Write-Host "Created $zip"
}
finally {
    Remove-Item -LiteralPath $staging -Recurse -Force -ErrorAction SilentlyContinue
}
