param(
    [string]$NodePath = 'node',
    [int]$Port = 8081
)

$ErrorActionPreference = 'Stop'
$node = (Get-Command $NodePath -ErrorAction Stop).Source
$version = & $node --version
if ($LASTEXITCODE -ne 0 -or [version]($version.TrimStart('v')) -lt [version]'24.3.0') {
    throw 'Use Node 24.3 or newer. Pass -NodePath with the full path to a supported node.exe.'
}

$env:PATH = (Split-Path -Parent $node) + [IO.Path]::PathSeparator + $env:PATH
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location -LiteralPath $repo
$Host.UI.RawUI.WindowTitle = 'Rally SDK 57 - mobile preview'
Write-Host "Starting Rally with Node $version on port $Port"
# Explicit system trust handles locally installed TLS inspection certificates.
# Do not disable certificate validation or alter the user's global npm config.
& $node --use-system-ca node_modules/expo/bin/cli start --lan --clear --port $Port
exit $LASTEXITCODE
