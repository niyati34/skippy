# 🚀 Vercel Deployment Guide for Skippy

## 📋 Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **Azure OpenAI**: Active Azure OpenAI resource with API key
3. **GitHub Repository**: Push your code to GitHub

## 🛠️ Step-by-Step Deployment

### 1. **Prepare Your Repository**

```bash
# Make sure all files are committed
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

### 2. **Deploy to Vercel**

#### Option A: Vercel CLI (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy from your project directory
vercel

# Follow the prompts:
# ? Set up and deploy "skippy"? [Y/n] y
# ? Which scope? [Your account]
# ? Link to existing project? [N/y] n
# ? What's your project's name? skippy-ai-study-buddy
# ? In which directory is your code located? ./
```

#### Option B: Vercel Dashboard

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your GitHub repository
4. Choose "Vite" framework preset
5. Click "Deploy"

### 3. **Configure Environment Variables**

In Vercel Dashboard → Project → Settings → Environment Variables, add:

```
VITE_OPENAI_API_BASE=https://your-resource.openai.azure.com
VITE_AZURE_OPENAI_KEY=your-azure-openai-api-key
VITE_AZURE_OPENAI_DEPLOYMENT=gpt-4o
VITE_AZURE_OPENAI_API_VERSION=2025-01-01-preview
```

**⚠️ Important**: These are server-side environment variables for the Vercel serverless function.

### 4. **Verify Deployment**

1. **Visit your app**: `https://your-project.vercel.app`
2. **Test AI functionality**: Upload a PDF and check console
3. **Check serverless function**: `https://your-project.vercel.app/api/azure-openai/chat`

## 📁 Project Structure for Vercel

```
skippy-rakhi-verse-main/
├── api/                     # Vercel serverless functions
│   └── azure-openai/
│       └── chat.js         # Azure OpenAI proxy
├── src/                    # React app source
├── public/                 # Static assets
├── vercel.json            # Vercel configuration
├── package.json           # Dependencies & scripts
└── .env.example          # Environment variables template
```

## 🔧 How It Works

### Local Development

- **Frontend**: `http://localhost:8080` (Vite dev server)
- **Proxy**: `http://localhost:5174` (Express server)
- **API calls**: Go to local Express server

### Production (Vercel)

- **Frontend**: `https://your-project.vercel.app`
- **Proxy**: `/api/azure-openai/chat` (Vercel serverless function)
- **API calls**: Go to Vercel serverless function

## 🚨 Troubleshooting

### Common Issues:

1. **"Missing Azure OpenAI environment variables"**

   - Add environment variables in Vercel dashboard
   - Redeploy after adding variables

2. **CORS errors**

   - Already handled in `/api/azure-openai/chat.js`
   - Check browser console for specific errors

3. **Build failures**

   ```bash
   # Try local build first
   npm run build

   # Fix any TypeScript errors
   npm run lint
   ```

4. **API timeout errors**
   - Azure OpenAI might be slow
   - Check Azure OpenAI service status
   - Verify API key permissions

### Debug Steps:

1. **Check deployment logs**: Vercel Dashboard → Project → Functions tab
2. **Test API endpoint**: Visit `https://your-project.vercel.app/api/azure-openai/chat`
3. **Browser console**: Check for network errors
4. **Environment variables**: Verify they're set correctly in Vercel

## 🎯 Production URLs

After successful deployment:

- **Main App**: `https://your-project.vercel.app`
- **API Endpoint**: `https://your-project.vercel.app/api/azure-openai/chat`
- **Test Pages**:
  - `https://your-project.vercel.app/test-date-wise-classes.html`
  - `https://your-project.vercel.app/test-expert-extraction.html`

## 🔒 Security Notes

- Environment variables are secure on Vercel
- API keys are not exposed to client-side code
- CORS is properly configured for production use
- Rate limiting is handled by Azure OpenAI

## 📊 Performance

- **Serverless functions**: Auto-scaling
- **Static assets**: Global CDN
- **Build time**: ~1-2 minutes
- **Cold start**: ~200-500ms for API calls

## 🚀 Next Steps

1. **Custom Domain**: Add in Vercel Dashboard → Project → Settings → Domains
2. **Analytics**: Enable in Vercel Dashboard → Project → Analytics
3. **Branch Deployments**: Auto-deploy from GitHub branches
4. **Environment Branches**: Different configs for dev/staging/prod

## 📞 Support

If you encounter issues:

1. Check Vercel [documentation](https://vercel.com/docs)
2. Review Azure OpenAI [API documentation](https://docs.microsoft.com/en-us/azure/cognitive-services/openai/)
3. Check the GitHub repository for updates

---

**🎉 Your Skippy AI Study Buddy is now live on Vercel!**
