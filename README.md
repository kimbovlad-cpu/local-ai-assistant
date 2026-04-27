# Local AI Assistant

Minimal MVP for a local AI assistant. The current app includes a Next.js chat UI
and a non-streaming OpenAI-backed chat API route.

## Setup

1. Install dependencies:

   ```powershell
   cd apps/web
   npm.cmd install
   ```

2. Configure your environment:

   ```powershell
   Copy-Item ..\..\.env.example .env.local
   ```

   Then set `OPENAI_API_KEY` in `apps/web/.env.local`. Do not commit real API
   keys.

3. Run the web app:

   ```powershell
   npm.cmd run dev
   ```

4. Open `http://localhost:3000`.

## Useful Commands

Run these from `apps/web`:

```powershell
npm.cmd run lint
npm.cmd run build
```
