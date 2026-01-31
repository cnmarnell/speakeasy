# 🔴 SECURITY FIX — Do This NOW

## The Problem
Your Supabase credentials and Deepgram API key are exposed in the codebase. Anyone viewing your site can see them in the browser's network tab or source code.

## What's Exposed
1. **Supabase URL & Anon Key** in `src/lib/supabase.js` — hardcoded
2. **Deepgram API Key** in `.env.example` — real key committed to git

---

## Fix 1: Update `src/lib/supabase.js`

Replace the entire file with:

```javascript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

---

## Fix 2: Update `.env.example`

Replace with placeholder values:

```
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
DEEPGRAM_API_KEY=your_deepgram_key_here
```

---

## Fix 3: Create `.env` (local only, never commit)

Create a `.env` file in the root with your real values:

```
VITE_SUPABASE_URL=https://jurwhwgtshyubmjaphnt.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp1cndod2d0c2h5dWJtamFwaG50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwNzgxNDQsImV4cCI6MjA3NjY1NDE0NH0.JS4p9u3t1AsK-0ZeCGXHFA4jj5TisTY1R5B5KAnj55M
DEEPGRAM_API_KEY=your_new_deepgram_key
```

---

## Fix 4: Update `.gitignore`

Make sure `.env` is in your `.gitignore`:

```
.env
.env.local
```

---

## Fix 5: Update Netlify Environment Variables

Go to Netlify → Site settings → Environment variables and add:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

---

## Fix 6: Rotate Your Deepgram API Key

1. Go to [Deepgram Console](https://console.deepgram.com/)
2. Revoke the old key: `a6568044c5405f04b832179a2ba6e936d9168f0f`
3. Generate a new key
4. Update your `.env` and Netlify/Supabase Edge Function secrets

---

## Commands to Apply Fix

```bash
# From the speakeasy-mvp directory:

# 1. Create the fixed supabase.js
cat > src/lib/supabase.js << 'EOF'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
EOF

# 2. Update .env.example
cat > .env.example << 'EOF'
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
DEEPGRAM_API_KEY=your_deepgram_key_here
EOF

# 3. Create .env with your real values (copy from above and fill in)

# 4. Commit
git add src/lib/supabase.js .env.example
git commit -m "fix: move credentials to environment variables"
git push
```

---

## Time to Fix: ~30 minutes

This is your #1 priority. Do it before anything else.
