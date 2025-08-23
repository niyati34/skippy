<div align="center">

<!--
Short Description: AI-powered study dashboard with weekly timetable, smart notes, flashcards, and a voice assistant. Built with React, Vite, Tailwind, Azure OpenAI, and Vercel.
Website: https://skippy-kohl.vercel.app
Topics: study dashboard ai timetable notes flashcards react vite tailwind azure-openai vercel assistant
-->

# Skippy — AI Study Dashboard with Weekly Timetable, Notes, and Voice Assistant

Organize classes, generate smart study notes and flashcards, and chat with a friendly voice assistant. Built with React + Vite + Tailwind + shadcn/ui. AI calls go through a serverless proxy: OpenRouter by default, Azure OpenAI as fallback.

</div>

## Live Demo

- Website: https://skippy-kohl.vercel.app

## Overview

Skippy is a sleek, student-focused dashboard that helps you:

- Build a clean weekly timetable that’s truly date-wise, day-wise, and time-aligned
- Upload files and generate structured notes and flashcards with AI
- Chat with a playful assistant that can speak out responses (with a permission-friendly UX)
- Deploy easily to Vercel with a secure serverless proxy for Azure OpenAI

The app runs great locally and in production on Vercel. In production, AI calls go first to `/api/openrouter/chat` and fall back to `/api/azure-openai/chat` if configured.

## Features

- Weekly Timetable (date-wise/day-wise/time-wise)
  - Generates specific instances for the current week from day-wise class storage
  - Accurate filtering per-day and per-time-slot
  - Clear buttons to clear only timetable items or delete all schedule items
- AI-Powered Notes & Flashcards
  - Uses OpenRouter (default) for structured markdown with headings, key points, and summaries
  - Fallback formatting when the API is unavailable to avoid single-paragraph dumps
- Skippy Assistant (Voice + Chat)
  - Greeting flow with browser-safe speech permissions
  - Password-gated access flow (no direct bypass in production)
  - Conversational guide that never reveals the password
- Zero-config Production API
  - Vercel serverless functions:
    - `api/openrouter/chat.js` (default)
    - `api/azure-openai/chat.js` (fallback)
  - Client auto-detects prod vs local and routes requests appropriately

## Tech Stack

- React 18, TypeScript, Vite 5
- Tailwind CSS, shadcn/ui, lucide-react
- OpenRouter (default) via serverless proxy, Azure OpenAI as fallback
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
- OpenRouter proxy: http://localhost:5174/api/openrouter/chat
- Azure proxy (fallback): http://localhost:5174/api/azure-openai/chat

You can use the local proxies. For direct Azure calls, set Vite env vars in `.env.local` (fallback path). In production, the proxy is always used.

## Environment Variables

Create `.env.local` for local dev (do not commit secrets). The app recognizes both Vite and generic names; prefer Vite names on the client.

Production env (set in Vercel Project → Settings → Environment Variables):

- OPENROUTER_API_KEY = your_openrouter_key
- OPENROUTER_MODEL = gpt-oss-20b (optional)
- OPENROUTER_API_BASE = https://openrouter.ai/api/v1/chat/completions (optional)

Optional Azure fallback (only if you want Azure available):

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
- Vercel functions: `api/openrouter/chat.js`, `api/azure-openai/chat.js`
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

1. Set env vars in Vercel:

- Required: `OPENROUTER_API_KEY`
- Optional: `OPENROUTER_MODEL` (default: gpt-oss-20b)
- Optional Azure fallback: `VITE_OPENAI_API_BASE`, `VITE_AZURE_OPENAI_KEY`, `VITE_AZURE_OPENAI_DEPLOYMENT`, `VITE_AZURE_OPENAI_API_VERSION`

2. Deploy

- Via CLI: `npm run deploy:prod`
- Or connect the GitHub repo to Vercel and trigger a production deployment

3. Production API path

- AI calls go first to `/api/openrouter/chat` (OpenRouter). On proxy failure, client falls back to `/api/azure-openai/chat` if configured.
- Both functions are configured in `vercel.json`.

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

- Short demo (replace with your actual file): `public/preview/demo.mp4`
  - In production: https://skippy-kohl.vercel.app/preview/demo.mp4

### Screenshots

Place images under `public/preview/` and update these paths if needed.

<div>

1. Dashboard Overview

![Dashboard Overview](public/preview/screenshot-1.png)


2. Weekly Timetable (date-wise/day-wise/time-wise)

<!-- Markdown image for local/standard preview -->
![Weekly Timetable](public/preview/screenshot-2.png)

<!-- HTML image for GitHub rich preview (from main branch) -->
<img width="1896" height="892" alt="Weekly Timetable Preview" src="https://github.com/user-attachments/assets/4b7289c3-70dd-4b38-a041-6aa5cf9de32c" />

3. Notes, Flashcards, and Assistant

![Notes & Assistant](public/preview/screenshot-3.png)

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
  openrouter/chat.js            # Vercel serverless proxy (default)
  azure-openai/chat.js          # Azure fallback proxy
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

## Releases

- See the [Releases page](https://github.com/niyati34/skippy/releases) for version history, changelogs, and downloadable builds (if published).

## Packages

- No published npm packages yet. If you want to package Skippy as a library or component, open an issue or PR!
