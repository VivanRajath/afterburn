# afterburn CLI demo — exercises the ask skill via the gitclaw REPL (Groq backend)
#
# Prerequisites:
#   1. GROQ_API_KEY set in your environment
#   2. gitclaw installed: npm install -g gitclaw
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
if (-not $env:GROQ_API_KEY) {
    Write-Host "ERROR: GROQ_API_KEY is not set." -ForegroundColor Red
    Write-Host "Get a free key at https://console.groq.com, then:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  `$env:GROQ_API_KEY = 'gsk_...'"
    exit 1
}

$gitclawPath = (Get-Command gitclaw -ErrorAction SilentlyContinue)?.Source
if (-not $gitclawPath) {
    Write-Host "ERROR: gitclaw is not installed." -ForegroundColor Red
    Write-Host "Install it with: npm install -g gitclaw" -ForegroundColor Yellow
    exit 1
}

Write-Host "Model: groq:llama-3.3-70b-versatile" -ForegroundColor DarkGray
Write-Host "Starting gitclaw REPL against agent/..." -ForegroundColor DarkGray
Write-Host ""
Write-Host "Sample prompts to try:" -ForegroundColor Green
Write-Host "  1. what can you do?"
Write-Host "  2. what incidents are there?"
Write-Host "  3. tell me about the band-aid pattern"
Write-Host "  4. what would happen if I changed src/payments/handler.py?"
Write-Host ""
Write-Host "Type /quit or Ctrl-C to exit." -ForegroundColor DarkGray
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host ""

gitclaw --dir agent
