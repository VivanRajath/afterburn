# Run the afterburn demo: ingest the sample post-mortem, then check the
# sample PR diff. Expects GITHUB_TOKEN and memory backend vars to be set.

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Write-Host "afterburn demo" -ForegroundColor Cyan
Write-Host "Sample incident: examples/sample-incident/incident.md"
Write-Host "Sample PR diff:  examples/sample-pr/diff.patch"
Write-Host ""

# Step 1 — Ingest the sample post-mortem
Write-Host "[1/2] Ingesting sample incident..." -ForegroundColor Yellow
gitagent run skillflows/ingest-incident.yaml `
    --input source_url=examples/sample-incident/incident.md

Write-Host ""

# Step 2 — Run the PR check against the sample diff
# pr_number=0 signals demo mode to check-pr; diff is read from diff_override
Write-Host "[2/2] Running PR check on sample diff..." -ForegroundColor Yellow
gitagent run skillflows/pr-check.yaml `
    --input repo=acme/payments-service `
    --input pr_number=0 `
    --input diff_override=examples/sample-pr/diff.patch

Write-Host ""
Write-Host "Demo complete." -ForegroundColor Green
Write-Host "Expected output: examples/sample-pr/expected-warning.md"
Write-Host "Run log:         memory/runtime/dailylog.md"
