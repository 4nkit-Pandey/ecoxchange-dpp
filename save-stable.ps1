# ============================================================
# EcoXchange — Save Stable Snapshot
# Run this whenever the app is fully working and you want
# to save that state as a restore point.
# Usage: .\save-stable.ps1
# Usage: .\save-stable.ps1 -Label "after-feature-xyz"
# ============================================================

param (
    [string]$Label = ""
)

$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm"
$tagName = if ($Label) { "stable-$Label" } else { "stable-$timestamp" }

Write-Host ""
Write-Host "💾 Saving stable snapshot..." -ForegroundColor Cyan

# 1. Stage and commit any uncommitted changes
$status = git status --porcelain
if ($status) {
    git add .
    git commit -m "chore: snapshot before tagging $tagName"
    Write-Host "✅ Uncommitted changes committed." -ForegroundColor Green
} else {
    Write-Host "✅ Working tree clean — nothing to commit." -ForegroundColor Green
}

# 2. Push to GitHub
git push origin main 2>&1 | Out-Null
Write-Host "✅ Pushed to GitHub (4nkit-Pandey/ecoxchange-dpp)" -ForegroundColor Green

# 3. Create annotated git tag
git tag -a $tagName -m "Stable snapshot: $tagName"
git push origin $tagName 2>&1 | Out-Null
Write-Host "✅ Git tag created: $tagName" -ForegroundColor Green

# 4. Deploy to Vercel and capture URL
Write-Host ""
Write-Host "🚀 Deploying to Vercel..." -ForegroundColor Cyan
$deployOutput = vercel deploy --prod --yes 2>&1
$deployUrl = ($deployOutput | Select-String "https://ecoxchange-.*\.vercel\.app").Matches.Value | Select-Object -First 1

# 5. Alias to ecoxchange-dpp.vercel.app
if ($deployUrl) {
    vercel alias set $deployUrl ecoxchange-dpp.vercel.app 2>&1 | Out-Null
    Write-Host "✅ Deployed and aliased to: https://ecoxchange-dpp.vercel.app" -ForegroundColor Green
}

# 6. Save snapshot record
$record = @{
    tag       = $tagName
    timestamp = $timestamp
    deployUrl = $deployUrl
    liveUrl   = "https://ecoxchange-dpp.vercel.app"
} | ConvertTo-Json

$record | Out-File -FilePath ".snapshots\$tagName.json" -Encoding UTF8 -Force

Write-Host ""
Write-Host "✅ Stable snapshot saved!" -ForegroundColor Green
Write-Host "   Tag     : $tagName" -ForegroundColor White
Write-Host "   Live URL: https://ecoxchange-dpp.vercel.app" -ForegroundColor White
Write-Host ""
Write-Host "To restore this snapshot later, run:" -ForegroundColor DarkGray
Write-Host ("   .\restore-stable.ps1 -Tag " + $tagName) -ForegroundColor Yellow
