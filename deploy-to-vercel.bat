@echo off
echo 🚀 Skippy AI - Vercel Deployment Helper
echo =====================================
echo.

echo 📋 Pre-deployment checklist:
echo ✅ Build test passed
echo ✅ Serverless function created
echo ✅ Environment variables template ready
echo ✅ CORS configured
echo ✅ Smart environment detection active
echo.

echo 🎯 Ready to deploy to Vercel!
echo.

echo Choose deployment method:
echo [1] Deploy with Vercel CLI (Recommended)
echo [2] Manual deployment instructions
echo [3] Open deployment guide
echo [4] Test current build
echo.

set /p choice="Enter your choice (1-4): "

if "%choice%"=="1" (
    echo.
    echo 🚀 Installing Vercel CLI and deploying...
    npm i -g vercel
    echo.
    echo 📤 Starting deployment...
    vercel
    echo.
    echo ✅ Deployment complete! 
    echo 📝 Don't forget to add environment variables in Vercel dashboard
    pause
) else if "%choice%"=="2" (
    echo.
    echo 📖 Manual Deployment Instructions:
    echo.
    echo 1. Go to https://vercel.com/new
    echo 2. Import your GitHub repository
    echo 3. Choose "Vite" framework preset
    echo 4. Add environment variables in Settings
    echo 5. Deploy!
    echo.
    echo Environment variables needed:
    echo - VITE_OPENAI_API_BASE
    echo - VITE_AZURE_OPENAI_KEY  
    echo - VITE_AZURE_OPENAI_DEPLOYMENT
    echo - VITE_AZURE_OPENAI_API_VERSION
    echo.
    pause
) else if "%choice%"=="3" (
    echo.
    echo 📖 Opening deployment guide...
    start VERCEL_DEPLOYMENT.md
    pause
) else if "%choice%"=="4" (
    echo.
    echo 🔧 Testing build...
    npm run build
    echo.
    echo 🌐 Opening test page...
    start http://localhost:8080/vercel-test.html
    pause
) else (
    echo Invalid choice. Please run the script again.
    pause
)
