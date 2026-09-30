# Inspire Match

AI-powered CV-to-JD matching by **Hire & Inspire by Christine**.

Upload a job description, drop in CVs, and get a ranked shortlist with a match %, per-criterion evidence, strengths, gaps, red flags and tailored interview questions. Export a branded client report (PDF) or the full ranking (CSV).

## Features
- Reads a JD (PDF, DOCX, TXT or pasted text) and turns it into weighted must-have / nice-to-have criteria
- Editable weights: change them any time and the ranking updates instantly
- Bulk CV scoring (3 at a time) with evidence for every score
- Must-have safeguard: a candidate who fails a must-have can't be marked "Strong fit"
- Blind screening mode (hides names and personal details)
- Branded client shortlist report + CSV export
- CVs are processed, never stored

## Run locally
```bash
npm install
cp .env.example .env.local   # then paste your Anthropic API key
npm run dev                  # open http://localhost:3000
```

## Deploy (GitHub + Vercel, free tier)
1. Push this folder to a new GitHub repo.
2. Go to vercel.com → **Add New Project** → import the repo.
3. In **Environment Variables** add `ANTHROPIC_API_KEY` (from console.anthropic.com).
4. Deploy. Every push to GitHub redeploys automatically.

> GitHub Pages can't be used on its own: it only serves static files, so the API key would be exposed. Vercel keeps the key on the server.

## Use your own domain
In Vercel → Project → Settings → Domains, add `match.hireandinspirebychristine.com`,
then add the CNAME record Vercel shows you at your domain provider.

## Project structure
```
app/page.js               UI (steps, results, report)
app/api/analyze-jd        Reads the JD → criteria + weights
app/api/score-cv          Scores one CV against the criteria
lib/prompts.js            The recruiter prompts (edit to tune scoring)
lib/claude.js             Claude API call (server only)
lib/files.js              PDF / DOCX / TXT handling
```

## Notes
- Max 4 MB per file (Vercel request limit).
- Vercel Hobby functions time out at 60 s; one CV per request keeps well inside that.
- Scores support recruiter judgement; they don't replace it.

## Roadmap
- Phase 2: login, saved jobs, talent pool (Supabase) to re-match past CVs against new roles
- Phase 3: public JD Checker for the agency website, client portal
