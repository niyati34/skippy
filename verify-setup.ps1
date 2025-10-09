# Verify Environment Setup
# Run this to check if your environment variables are correctly configured

Write-Host "🔍 Checking Environment Configuration..." -ForegroundColor Cyan
Write-Host ""

# Check if .env.local exists
if (Test-Path ".env.local") {
    Write-Host "✅ .env.local file found" -ForegroundColor Green
} else {
    Write-Host "❌ .env.local file NOT found" -ForegroundColor Red
    Write-Host "   Create it by copying .env.example" -ForegroundColor Yellow
}

# Check if .env.vercel exists
if (Test-Path ".env.vercel") {
    Write-Host "✅ .env.vercel file found (for Vercel import)" -ForegroundColor Green
} else {
    Write-Host "⚠️  .env.vercel file NOT found" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📋 Local Environment Variables (.env.local):" -ForegroundColor Cyan
Write-Host ""

# Load .env.local
if (Test-Path ".env.local") {
    $envContent = Get-Content ".env.local"
    
    # Check critical variables
    $checks = @{
        "OPENROUTER_API_KEY" = "OpenRouter API Key"
        "GEMINI_API_KEY" = "Gemini API Key"
        "VITE_GEMINI_API_KEY" = "Vite Gemini API Key"
        "UNLOCK_PASSWORDS" = "Unlock Passwords"
        "UNLOCK_SESSION_SECRET" = "Session Secret"
    }
    
    foreach ($key in $checks.Keys) {
        $line = $envContent | Where-Object { $_ -match "^$key=" }
        if ($line) {
            $value = ($line -split "=", 2)[1]
            if ($value -and $value.Trim() -ne "") {
                Write-Host "  ✅ $($checks[$key]): Set" -ForegroundColor Green
            } else {
                Write-Host "  ⚠️  $($checks[$key]): Empty" -ForegroundColor Yellow
            }
        } else {
            Write-Host "  ❌ $($checks[$key]): Not found" -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "🌐 Production Checklist (Vercel):" -ForegroundColor Cyan
Write-Host ""
Write-Host "  1. Go to: https://vercel.com/dashboard" -ForegroundColor White
Write-Host "  2. Select your 'skippy' project" -ForegroundColor White
Write-Host "  3. Go to Settings → Environment Variables" -ForegroundColor White
Write-Host "  4. Import .env.vercel or add variables manually" -ForegroundColor White
Write-Host "  5. Redeploy your site" -ForegroundColor White
Write-Host ""

Write-Host "📚 Documentation Files:" -ForegroundColor Cyan
Write-Host ""

$docs = @(
    "VERCEL_DEPLOYMENT_GUIDE.md",
    "QUICK_VERCEL_SETUP.md",
    ".env.vercel"
)

foreach ($doc in $docs) {
    if (Test-Path $doc) {
        Write-Host "  ✅ $doc" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $doc (missing)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "🧪 Quick Test:" -ForegroundColor Cyan
Write-Host "  Local: http://localhost:8080" -ForegroundColor White
Write-Host "  Production: https://skippy-kohl.vercel.app" -ForegroundColor White
Write-Host ""
Write-Host "🔐 Test Passwords:" -ForegroundColor Cyan
Write-Host "  password, unlock, skippy, 123, admin, test" -ForegroundColor White
Write-Host ""

Write-Host "✨ Setup verification complete!" -ForegroundColor Green
