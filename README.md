
https://github.com/user-attachments/assets/772a8f12-d823-45e3-8eda-492622ea0663
<div align="center">

# Skippy — AI Study Dashboard with Weekly Timetable, Notes, and Voice Assistant

Organize classes, generate smart study notes and flashcards, and chat with a friendly voice assistant. Built with React + Vite + Tailwind + shadcn/ui, powered by Azure OpenAI via a Vercel serverless proxy.

</div>

## Live Demo

- Website: https://skippy-kohl.vercel.app

## Overview

Skippy is a sleek, student-focused dashboard that helps you:

- Build a clean weekly timetable that’s truly date-wise, day-wise, and time-aligned
- Upload files and generate structured notes and flashcards with AI
- Chat with a playful assistant that can speak out responses (with a permission-friendly UX)
- Deploy easily to Vercel with a secure serverless proxy for Azure OpenAI

The app runs great locally and in production on Vercel. In production, all AI calls go through a secure function at `/api/azure-openai/chat`.

## Features

- Weekly Timetable (date-wise/day-wise/time-wise)
  - Generates specific instances for the current week from day-wise class storage
  - Accurate filtering per-day and per-time-slot
  - Clear buttons to clear only timetable items or delete all schedule items
- AI-Powered Notes & Flashcards
  - Uses Azure OpenAI for structured markdown with headings, key points, and summaries
  - Fallback formatting when the API is unavailable to avoid single-paragraph dumps
- Skippy Assistant (Voice + Chat)
  - Greeting flow with browser-safe speech permissions
  - Password-gated access flow (no direct bypass in production)
  - Conversational guide that never reveals the password
- Zero-config Production API
  - Vercel serverless function at `api/azure-openai/chat.js`
  - Client auto-detects prod vs local and routes requests appropriately

## Tech Stack

- React 18, TypeScript, Vite 5
- Tailwind CSS, shadcn/ui, lucide-react
- Azure OpenAI (Chat Completions) via serverless proxy
- Vercel for deployment

## Quick Start (Local)

Requirements: Node 18+ and npm.

```powershell
# Install dependencies
npm i

# Start Vite dev server
npm run dev

# Optional: start the local Azure OpenAI proxy (Express)
npm run server

# Or run both (Windows PowerShell)
npm run dev:all
```

Local endpoints used by the app:

- Frontend: http://localhost:5173
- Local proxy (optional): http://localhost:5174/api/azure-openai/chat

You can use the local proxy or configure direct Azure env vars in `.env.local` for the browser to call Azure directly. In production, the proxy is always used.

## Environment Variables

Create `.env.local` for local dev (do not commit secrets). The app recognizes both Vite and generic names; prefer Vite names on the client.

Required for production (set in Vercel Project → Settings → Environment Variables):

- VITE_OPENAI_API_BASE = https://YOUR-RESOURCE-NAME.openai.azure.com
- VITE_AZURE_OPENAI_KEY = your_azure_openai_key
- VITE_AZURE_OPENAI_DEPLOYMENT = your_model_deployment_name (e.g., gpt-4o)
- VITE_AZURE_OPENAI_API_VERSION = 2025-01-01-preview

Optional equivalents (used by server/local):

- OPENAI_API_BASE
- AZURE_OPENAI_API_KEY
- AZURE_OPENAI_DEPLOYMENT_NAME
- AZURE_OPENAI_API_VERSION

Where they’re used:

- Client service: `src/services/azureOpenAI.ts`
- Vercel function: `api/azure-openai/chat.js`
- Local proxy: `server/index.mjs`

More notes: see `vercel-env-fix.md` for the production env fix context.

## Development Scripts

Defined in `package.json`:

- npm run dev — start Vite dev server
- npm run server — start local Express proxy at http://localhost:5174
- npm run dev:all — launch proxy and Vite together (Windows-friendly)
- npm run build — production build
- npm run preview — preview built app locally
- npm run deploy — deploy to Vercel (CLI)
- npm run deploy:prod — deploy to Vercel production

## Deploying to Vercel

1. Set the four required env vars in Vercel:

- VITE_OPENAI_API_BASE
- VITE_AZURE_OPENAI_KEY
- VITE_AZURE_OPENAI_DEPLOYMENT
- VITE_AZURE_OPENAI_API_VERSION

2. Deploy

- Via CLI: `npm run deploy:prod`
- Or connect the GitHub repo to Vercel and trigger a production deployment

3. Production API path

- All AI calls go to `/api/azure-openai/chat`, implemented at `api/azure-openai/chat.js`
- The function is configured in `vercel.json`

For deeper guidance, see `VERCEL_DEPLOYMENT.md` and `DEPLOYMENT_READY.md`.

## Password Unlock Flow (Skippy Assistant)

File: `src/components/SkippyAssistant.tsx`

- The greeting appears and attempts to speak automatically; if blocked, a friendly modal prompts to enable voice
- The “Skip Instructions” button shows after ~5s and now leads to the password prompt (no direct dashboard button)
- The assistant accepts only the intended password variants (e.g., “onestring7”, “one string seven”)
- On success, `onPasswordUnlock("unlocked")` is called to navigate into the dashboard

More details are documented in `PASSWORD_FIX.md`.

## Weekly Timetable Logic

File: `src/components/WeeklyTimetableView.tsx`

- Instances are generated for the current Monday–Sunday using `generateTimetableInstancesForWeek()`
- Each class is attached to an exact date string (YYYY-MM-DD) for the week, avoiding “placeholder dates”
- Day view and time-slot filters pull items by the calculated date and align to slots within ±30 minutes
- Clear actions:
  - Clear Timetable: remove only recurring class items (and clear day-wise storage)
  - Delete All: wipe everything, including assignments/notes

Timetable storage is managed via `TimetableStorage` and general schedule items via `ScheduleStorage` in `src/lib/storage.ts`.

## Troubleshooting

- 500 error from `/api/azure-openai/chat` on Vercel

  - Cause: Missing env vars
  - Fix: Set the four VITE\_\* env vars in Vercel and redeploy (see `vercel-env-fix.md`)

- “Only big paragraph is showing” in generated notes

  - Cause: AI API failed, fallback formatting kicked in
  - Fix: Ensure env vars are configured and the serverless function is healthy

- Browser won’t speak the greeting

  - Cause: Autoplay/speech blocked by browser until user interaction
  - Fix: Click “Enable Voice & Hear Skippy” in the modal, or press replay

- Local dev can’t call Azure directly from the browser
  - Use the local proxy (`npm run server`) or set the Vite env vars and allow the browser call; in production, the proxy is always used

## Preview

### Video
- In production: https://github.com/user-attachments/assets/772a8f12-d823-45e3-8eda-492622ea0663


### Screenshots

Place images under `public/preview/` and update these paths if needed.

<div>

1) Dashboard Overview

<img width="1901" height="911" alt="image" src="https://github.com/user-attachments/assets/3359faf4-2e05-4563-a6d0-3405f785b526" />
<img width="1917" height="905" alt="image" src="https://github.com/user-attachments/assets/c9d9bd54-ba7e-4d90-8963-667d36dba757" />

2) Weekly Timetable (date-wise/day-wise/time-wise)
   
<img width="1896" height="892" alt="image" src="https://github.com/user-attachments/assets/4b7289c3-70dd-4b38-a041-6aa5cf9de32c" />

3) Notes, Flashcards, and Assistant

<img width="1892" height="903" alt="image" src="https://github.com/user-attachments/assets/f5217c18-b19e-4685-9bb5-5cfd46256d51" />


</div>

## Project Structure (highlights)

```
src/
	components/
		WeeklyTimetableView.tsx     # Weekly calendar with date-wise instances
		SkippyAssistant.tsx         # Voice/chat assistant + password flow
		...                         # Other dashboard features
	services/
		azureOpenAI.ts              # Proxy-first AI client with formatting fallbacks
server/
	index.mjs                     # Local Express proxy for Azure OpenAI
api/
	azure-openai/chat.js          # Vercel serverless proxy for production
vercel.json                     # Function config + rewrites
```

## Security Notes

- Never commit secrets; use `.env.local` for local and Vercel dashboard for production
- The client uses only `VITE_*` variables; server and function support both `VITE_*` and generic names

## Contributing

1. Create a feature branch
2. Keep PRs focused and small
3. Add brief notes in PR description (what/why/impact)

## License

Proprietary. All rights reserved (or update this section to your preferred license).

## Credits

- Built with React + Vite + Tailwind + shadcn/ui
- Azure OpenAI for AI features
- Vercel for painless deployment
