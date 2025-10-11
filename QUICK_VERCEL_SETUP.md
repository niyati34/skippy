# Quick Vercel Setup (3 Steps)

## 1️⃣ Delete Old Azure Variables

In Vercel Dashboard → Settings → Environment Variables, delete:

- VITE_OPENAI_API_BASE
- VITE_AZURE_OPENAI_KEY
- VITE_AZURE_OPENAI_DEPLOYMENT
- VITE_AZURE_OPENAI_API_VERSION
- AZURE_OPENAI_API_KEY
- AZURE_OPENAI_DEPLOYMENT_NAME
- AZURE_OPENAI_API_VERSION

## 2️⃣ Import .env.vercel

Copy all contents from `.env.vercel` and paste into Vercel's bulk import.

OR use this quick command:

```powershell
# If you have Vercel CLI linked:
vercel env pull
```

## 3️⃣ Redeploy

Vercel Dashboard → Deployments → Latest → ⋮ → Redeploy

---

**Test passwords:** password, unlock, skippy, 123

**Site:** https://skippy-kohl.vercel.app
