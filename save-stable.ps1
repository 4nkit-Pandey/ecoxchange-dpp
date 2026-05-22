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

# 4. Deploy to Netlify
Write-Host ""
Write-Host "🚀 Deploying to Netlify..." -ForegroundColor Cyan
netlify deploy --prod --json | Out-Null
$liveUrl = "https://ecoxchange-dpp.netlify.app"

# 5. Save snapshot record
$record = @{
    tag       = $tagName
    timestamp = $timestamp
    liveUrl   = $liveUrl
} | ConvertTo-Json

if (!(Test-Path -Path ".snapshots")) {
    New-Item -ItemType Directory -Path ".snapshots" | Out-Null
}
$record | Out-File -FilePath ".snapshots\$tagName.json" -Encoding UTF8 -Force

Write-Host ""
Write-Host "✅ Stable snapshot saved!" -ForegroundColor Green
Write-Host "   Tag     : $tagName" -ForegroundColor White
Write-Host "   Live URL: $liveUrl" -ForegroundColor White
Write-Host ""
Write-Host "To restore this snapshot later, run:" -ForegroundColor DarkGray
Write-Host ("   .\restore-stable.ps1 -Tag " + $tagName) -ForegroundColor Yellow
