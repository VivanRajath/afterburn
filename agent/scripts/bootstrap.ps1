# Bootstrap afterburn: verify environment, validate the graph, and seed from
# the configured memory backend.

param(
    [switch]$SkipIngest   # skip the bootstrap-from-cognis flow (env check only)
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Write-Host "afterburn bootstrap" -ForegroundColor Cyan

# 1. Check required env vars for the active backend
$backend = if ($env:AFTERBURN_MEMORY_BACKEND) { $env:AFTERBURN_MEMORY_BACKEND } else { "cognis" }
$required = @("GITHUB_TOKEN")

switch ($backend) {
    "cognis"     { $required += @("LYZR_API_KEY", "COGNIS_OWNER_ID") }
    "filesystem" { $required += @("AFTERBURN_FS_ROOT") }
    "sqlite"     { $required += @("AFTERBURN_SQLITE_PATH") }
    "s3"         { $required += @("AFTERBURN_S3_BUCKET", "AFTERBURN_S3_REGION",
                                  "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY") }
}

$missing = @()
foreach ($var in $required) {
    if (-not [System.Environment]::GetEnvironmentVariable($var)) {
        $missing += $var
    }
}
if ($missing.Count -gt 0) {
    Write-Error "Missing required environment variables: $($missing -join ', ')`nCopy .env.example to .env and fill in values."
    exit 1
}
Write-Host "  Environment: OK (backend=$backend)" -ForegroundColor Green

# 2. Validate knowledge/incident-graph.json is well-formed JSON
$graphPath = Join-Path $PSScriptRoot "..\knowledge\incident-graph.json"
try {
    $graph = Get-Content $graphPath -Raw | ConvertFrom-Json
    if ($null -eq $graph.nodes -or $null -eq $graph.edges) {
        throw "Missing required 'nodes' or 'edges' arrays"
    }
    Write-Host "  knowledge/incident-graph.json: OK (nodes=$($graph.nodes.Count), edges=$($graph.edges.Count))" -ForegroundColor Green
} catch {
    Write-Error "knowledge/incident-graph.json validation failed: $_"
    exit 1
}

# 3. Run bootstrap-from-cognis to seed the graph from the memory backend
if (-not $SkipIngest) {
    Write-Host "  Running bootstrap-from-cognis skillflow..." -ForegroundColor Yellow
    gitagent run skillflows/bootstrap-from-cognis.yaml
    Write-Host "  Bootstrap flow: complete" -ForegroundColor Green
}

Write-Host "Bootstrap complete." -ForegroundColor Green
