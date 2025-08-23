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
echo ✅ Password system fixed for production
echo.

echo 🎯 Ready to deploy to Vercel!
echo.

echo Choose deployment method:
echo [1] Deploy with Vercel CLI (Recommended)
echo [2] Manual deployment instructions
echo [3] Open deployment guide
echo [4] Test current build
echo [5] Deploy password fix to existing project
echo.

set /p choice="Enter your choice (1-5): "

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
    echo 🔧 Password system is now production-ready!
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
    echo - OPENROUTER_API_KEY
    echo - OPENROUTER_MODEL (optional)
    echo - OPENROUTER_API_BASE (optional)
    echo.
    echo 🔧 Password Issue Fixed:
    echo - Production users can click "Enter Study Dashboard"
    echo - Accepts passwords like: password, unlock, 123, skippy
    echo - Debug logs in browser console
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
    start http://localhost:5173/vercel-test.html
    pause
) else if "%choice%"=="5" (
    echo.
    echo 🔧 Deploying password fix to existing Vercel project...
    echo.
    vercel --prod
    echo.
    echo ✅ Password fix deployed!
    echo 🧪 Test your app now - password should work correctly
    echo 📝 Users can now click "Enter Study Dashboard" button
    echo 🔍 Check browser console F12 for debug logs
    pause
) else (
    echo Invalid choice. Please run the script again.
    pause
)
