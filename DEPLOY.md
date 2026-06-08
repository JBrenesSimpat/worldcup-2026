# Deploying to Vercel

This app is a static Next.js site. Deployment is free and zero-config on Vercel's Hobby plan.

## One-time setup (dashboard method — recommended)

1. **Create a Vercel account** at https://vercel.com → **Sign Up** → **Continue with GitHub** → **Authorize Vercel**. Pick the **Hobby** (free) plan.
2. **Import the repo**: click **Add New… → Project** (or go to https://vercel.com/new). Find **`worldcup-2026`** and click **Import**.
   - If it's not listed, click **Adjust GitHub App Permissions** and grant access to the repo.
3. **Configure** — nothing to change:
   - Framework Preset: **Next.js** (auto-detected)
   - Environment Variables: **leave empty** (the data is committed; the API token is only used by the GitHub Action, not the Vercel build).
4. Click **Deploy**. Wait ~1–2 minutes.
5. Your site is live at `https://worldcup-2026.vercel.app` (or similar).

## Install on a phone (PWA)

- iPhone: open the URL in **Safari** → **Share** → **Add to Home Screen**.
- Android: open in **Chrome** → menu → **Install app**.

## How updates flow

- **Any push to `main`** → Vercel auto-redeploys.
- **During match days** → the GitHub Action (`.github/workflows/update-results.yml`) fetches scores from football-data.org, commits changed data, which triggers a Vercel redeploy. Results appear within ~30 min of each final whistle.

## Notes

- Hobby plan is **non-commercial use only**.
- GitHub Actions is free/unlimited on this **public** repo.
- The `FOOTBALL_DATA_TOKEN` is stored as a GitHub Actions secret — never in the repo or the Vercel build.

## Alternative: Vercel CLI

```bash
npm i -g vercel
vercel login
vercel          # preview deploy
vercel --prod   # production deploy
```
