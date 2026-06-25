---
title: Physical AI Textbook Auth
emoji: 🔐
colorFrom: yellow
colorTo: green
sdk: docker
app_port: 7860
pinned: false
---

# Auth Server — Better-Auth

Standalone authentication service for the textbook. Provides email/password
**signup & signin**, and captures each reader's **software & hardware background**
so chapters can be personalized.

## Why a separate service?

The book is a static Docusaurus site (GitHub Pages), which can't run server-side
auth. Better-Auth is a Node library, so it runs here as a small Express server that
the book talks to over CORS with cookies. It shares the **same Neon Postgres**
database as the backend.

## Setup

```bash
cd auth
npm install
cp .env.example .env          # fill in DATABASE_URL + BETTER_AUTH_SECRET

# Create the Better-Auth tables (user, session, account) in Neon.
# additionalFields add softwareBackground / hardwareBackground / experienceLevel
# columns to the user table.
npm run migrate

npm run dev                    # http://localhost:3001
```

Health check: `curl http://localhost:3001/health`

## Captured background fields

Collected at signup and stored on the `user` row:

| Field | Example values |
|-------|----------------|
| `experienceLevel` | Beginner / Intermediate / Advanced |
| `softwareBackground` | "Python & data/ML", "Systems / C++ / embedded", … |
| `hardwareBackground` | "None yet", "Some robotics (ROS, sensors)", … |

The book reads these from the session and sends them to the backend's
`/personalize` and `/chatkit` endpoints to tailor explanations.

## Deploy

Any Node host (Render, Railway, Fly, a HF Space with the Node SDK). Set the env
vars from `.env`, set `BOOK_ORIGIN` / `EXTRA_TRUSTED_ORIGINS` to the deployed book
origin, and ensure `AUTH_BASE_URL` is the public URL of this service. Because the
book and auth server are on different origins in production, cookies use
`SameSite=None; Secure` (configured in `src/auth.ts`).
