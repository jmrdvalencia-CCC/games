# 5 Seconds Rule — Cloudflare Deployment Guide

## Prerequisites
- Cloudflare account (free tier)
- Node.js installed
- `npm install -g wrangler` then `wrangler login`

---

## Step 1: Create D1 Database

```bash
cd worker
npm install
wrangler d1 create five-seconds-rule-db
```

Copy the `database_id` from the output and paste it into `wrangler.toml`:
```toml
database_id = "PASTE_YOUR_ID_HERE"
```

Then initialize the schema:
```bash
npm run db:init
```

---

## Step 2: Deploy the Worker

```bash
npm run deploy
```

Note the Worker URL shown (e.g. `https://five-seconds-rule.yourname.workers.dev`)

---

## Step 3: Update Frontend API URL

Open `frontend/index.html` and replace line:
```js
const API = 'https://five-seconds-rule.YOUR_SUBDOMAIN.workers.dev';
```
with your actual Worker URL.

---

## Step 4: Deploy Frontend to Cloudflare Pages

Option A — Drag & Drop (easiest):
1. Go to https://pages.cloudflare.com
2. Click "Create a project" → "Direct Upload"
3. Upload the `frontend/` folder
4. Done! You get a `*.pages.dev` URL

Option B — Git:
1. Push this repo to GitHub
2. Connect it in Cloudflare Pages
3. Set build output directory to `frontend`
4. No build command needed

---

## Free Tier Limits (more than enough)

| Service            | Free Limit                        |
|--------------------|-----------------------------------|
| Workers            | 100,000 req/day                   |
| Durable Objects    | 1M req/month, 1GB storage         |
| D1 Database        | 5M reads/day, 100K writes/day     |
| Pages              | Unlimited static hosting          |

---

## Reset All Data

Click the "Reset All Data" button on the home screen, or call:
```
DELETE https://your-worker.workers.dev/api/reset
```

---

## Game Flow Summary

1. Pitcher opens app → "I'm the Pitcher" → enters name → gets room code
2. Hitters open app → "I'm a Hitter" → enter room code + name
3. Pitcher clicks "Start Round" → shouts a category out loud
4. Hitters type words and hit Submit for each word
5. Pitcher clicks "Close Hitting Period"
6. Pitcher removes invalid words from the Unique Words list
7. Pitcher clicks "Award Points" (1 point per 3 unique valid words)
8. Repeat rounds or click "End Game" to see final scores
