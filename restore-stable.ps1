# ============================================================
# EcoXchange — Restore Stable Snapshot
# Restores the app to any previously saved stable tag.
# Usage: .\restore-stable.ps1               (restores latest stable)
# Usage: .\restore-stable.ps1 -Tag stable-v1.0
# ============================================================

param (
    [string]$Tag = ""
)

Write-Host ""
Write-Host "🔄 EcoXchange Restore Stable" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor DarkCyan

# List available tags if no tag specified
if (-not $Tag) {
    Write-Host ""
    Write-Host "Available stable snapshots:" -ForegroundColor Yellow
    $tags = git tag --sort=-creatordate | Where-Object { $_ -like "stable-*" }
    if (-not $tags) {
        Write-Host "  No stable snapshots found. Run .\save-stable.ps1 first." -ForegroundColor Red
        exit 1
    }
    $tags | ForEach-Object { Write-Host "  • $_" -ForegroundColor White }
    Write-Host ""
    $Tag = $tags | Select-Object -First 1
    Write-Host "↩️  Auto-selecting latest: $Tag" -ForegroundColor Green
}

# Confirm
Write-Host ""
Write-Host "⚠️  This will restore code to: $Tag" -ForegroundColor Yellow
Write-Host "   Current uncommitted changes will be LOST." -ForegroundColor Red
$confirm = Read-Host "Continue? (y/N)"
if ($confirm -ne 'y' -and $confirm -ne 'Y') {
    Write-Host "Cancelled." -ForegroundColor DarkGray
    exit 0
}

Write-Host ""
Write-Host "🔁 Restoring to $Tag..." -ForegroundColor Cyan

# 1. Reset code to the tag
git fetch --tags 2>&1 | Out-Null
git checkout $Tag -- . 2>&1
Write-Host "✅ Code restored to tag: $Tag" -ForegroundColor Green

# 2. Commit the restore
git add .
git commit -m "chore: restored to stable snapshot $Tag" 2>&1 | Out-Null
git push origin main 2>&1 | Out-Null
Write-Host "✅ Restore committed and pushed to GitHub" -ForegroundColor Green

# 3. Install deps (in case anything changed)
Write-Host "📦 Installing dependencies..." -ForegroundColor Cyan
npm install --silent 2>&1 | Out-Null
Write-Host "✅ Dependencies ready" -ForegroundColor Green

# 4. Redeploy to Vercel
Write-Host "🚀 Redeploying to Vercel..." -ForegroundColor Cyan
$deployOutput = vercel deploy --prod --yes 2>&1
$deployUrl = ($deployOutput | Select-String "https://ecoxchange-.*\.vercel\.app").Matches.Value | Select-Object -First 1

if ($deployUrl) {
    vercel alias set $deployUrl ecoxchange-dpp.vercel.app 2>&1 | Out-Null
    Write-Host "✅ Live at: https://ecoxchange-dpp.vercel.app" -ForegroundColor Green
} else {
    Write-Host "⚠️  Deploy completed but couldn't auto-alias. Run:" -ForegroundColor Yellow
    Write-Host "   vercel alias set <url> ecoxchange-dpp.vercel.app" -ForegroundColor White
}

Write-Host ""
Write-Host "✅ Restore complete!" -ForegroundColor Green
Write-Host "   Snapshot : $Tag" -ForegroundColor White
Write-Host "   Live URL : https://ecoxchange-dpp.vercel.app" -ForegroundColor White
Write-Host "   Local dev: npm run dev" -ForegroundColor White
Write-Host ""
