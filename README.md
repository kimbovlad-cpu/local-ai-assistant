# Local AI Assistant

Next.js RAG assistant with:

- public streaming chat
- markdown answers
- document citations
- admin knowledge-base upload/list/delete controls
- Supabase persistence with `pgvector`
- OpenAI embeddings and chat completions

## Environment Variables

Set these locally and in Vercel. Never commit real values.

```powershell
OPENAI_API_KEY=
SUPABASE_URL=
SUPABASE_ANON_KEY=
```

`OPENAI_API_KEY` is used for chat responses and document embeddings.
`SUPABASE_URL` and `SUPABASE_ANON_KEY` are used for Supabase Auth and by server
routes to store, delete, list, and retrieve document chunks. The anon key is
safe to use in the browser; do not use a service role key in this app.

## Local Setup

1. Install dependencies:

   ```powershell
   cd apps/web
   npm.cmd install
   ```

2. Create local environment file:

   ```powershell
   Copy-Item .env.example .env.local
   ```

3. Fill `apps/web/.env.local`:

   ```powershell
   OPENAI_API_KEY=your_openai_key
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. Prepare Supabase:

   Run `apps/web/supabase/schema.sql` in the Supabase SQL editor.

   If you previously created `match_document_chunks` with a different return
   type, run this first:

   ```sql
   drop function if exists match_document_chunks(vector, integer);
   ```

5. Enable Supabase Auth:

   In Supabase Dashboard, open Authentication > Providers and enable Email.
   For local testing, you can leave email confirmations disabled. For Vercel,
   add your deployed URL in Authentication > URL Configuration.

6. Create an admin user:

   In Supabase Dashboard, open Authentication > Users, add a user with email and
   password, then use those credentials in the Admin Login section. At this
   stage, any authenticated Supabase user is treated as an admin.

7. Start local dev server:

   ```powershell
   npm.cmd run dev
   ```

8. Open `http://localhost:3000`.

## Embed Widget

Use `/widget` for an iframe-friendly public chatbot with no admin controls,
navigation, or full-page header.

```html
<iframe
  src="https://your-vercel-domain.vercel.app/widget"
  title="AI assistant"
  width="380"
  height="600"
  style="border: 0; max-width: 100%;"
></iframe>
```

For local testing, use `http://localhost:3000/widget` as the `src`.

To add the floating chat launcher to another site, include:

```html
<script src="https://YOUR_DOMAIN/embed.js"></script>
```

The script creates a bottom-right chat button and opens `/widget` in an iframe.
For local testing, use `http://localhost:3000/embed.js`.

## Useful Commands

Run from `apps/web`:

```powershell
npm.cmd run lint
npm.cmd run build
npm.cmd run start
```

## Vercel Deployment

1. Push this repo to GitHub.

2. In Vercel, create a new project from the repo.

3. Set project root directory:

   ```text
   apps/web
   ```

4. Keep the default Next.js build settings:

   ```text
   Build Command: npm run build
   Install Command: npm install
   Output Directory: .next
   ```

5. Add Environment Variables in Vercel Project Settings:

   ```text
   OPENAI_API_KEY
   SUPABASE_URL
   SUPABASE_ANON_KEY
   ```

6. Deploy.

7. After deploy, test:

   - public chat without logging in
   - admin login
   - admin upload of a `.txt` file
   - admin document list
   - admin delete
   - public chat streaming
   - markdown rendering
   - citations with document name and chunk number

## Production Notes

- Do not expose `OPENAI_API_KEY` in client code.
- Do not add or expose a Supabase service role key.
- `SUPABASE_ANON_KEY` is used for browser auth and server-side Supabase calls.
- The Admin section is protected by Supabase Auth, but role-based admin
  authorization is not implemented yet. Any authenticated user can manage the
  knowledge base.
