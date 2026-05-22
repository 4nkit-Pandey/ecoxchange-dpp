$files = @(
  "src/app/api/products/activate/route.ts",
  "src/app/api/marketplace/route.ts",
  "src/app/api/transfer/route.ts",
  "src/app/api/repairs/log/route.ts",
  "src/app/api/admin/stats/route.ts",
  "src/app/api/admin/products/route.ts",
  "src/app/api/user/products/route.ts"
)

foreach ($file in $files) {
  if (Test-Path $file) {
    $content = Get-Content $file -Raw
    $updated = $content -replace '@/lib/auth"', '@/lib/server-auth"'
    Set-Content $file $updated
    Write-Host "Updated: $file"
  }
}

Write-Host "All auth imports updated."
