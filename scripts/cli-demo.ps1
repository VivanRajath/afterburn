# afterburn CLI demo — exercises the ask skill via the gitclaw REPL
#
# Prerequisites:
#   1. ANTHROPIC_API_KEY set in your environment (or .env.local)
#   2. gitclaw installed: npm install -g gitclaw
#   3. gitagent installed: npm install -g @open-gitagent/gitagent
#
# Run:
#   npm run demo:cli
#   — or —
#   powershell -File scripts/cli-demo.ps1

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "afterburn CLI demo" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host ""

# Check prerequisites
if (-not $env:ANTHROPIC_API_KEY -or $env:ANTHROPIC_API_KEY -eq "sk-ant-your-key-here") {
    Write-Host "ERROR: ANTHROPIC_API_KEY is not set." -ForegroundColor Red
    Write-Host "Set it in your environment or in .env.local, then re-run." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  `$env:ANTHROPIC_API_KEY = 'sk-ant-...'"
    exit 1
}

$gitclawPath = (Get-Command gitclaw -ErrorAction SilentlyContinue)?.Source
if (-not $gitclawPath) {
    Write-Host "ERROR: gitclaw is not installed." -ForegroundColor Red
    Write-Host "Install it with: npm install -g gitclaw" -ForegroundColor Yellow
    exit 1
}

Write-Host "Starting gitclaw REPL against agent/..." -ForegroundColor DarkGray
Write-Host ""
Write-Host "Sample prompts to try:" -ForegroundColor Green
Write-Host "  1. list incidents             — summarise what's in the graph"
Write-Host "  2. tell me about the payment processor incidents"
Write-Host "  3. what would happen if I changed src/payments/handler.py?"
Write-Host "  4. what can you do?"
Write-Host ""
Write-Host "Type 'exit' or Ctrl-C to quit." -ForegroundColor DarkGray
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host ""

gitclaw --dir agent
