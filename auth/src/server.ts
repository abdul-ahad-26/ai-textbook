import 'dotenv/config'; // load .env before anything reads process.env
import express from 'express';
import cors from 'cors';
import {toNodeHandler} from 'better-auth/node';
import {auth} from './auth';

const app = express();
const port = Number(process.env.PORT || 3001);

const bookOrigin = process.env.BOOK_ORIGIN || 'http://localhost:3000';
const extra = process.env.EXTRA_TRUSTED_ORIGINS?.split(',').map((s) => s.trim()).filter(Boolean) ?? [];

app.use(
  cors({
    origin: [bookOrigin, ...extra, /https:\/\/.*\.github\.io$/],
    credentials: true,
    // Expose the bearer token header so the browser client can read and store it.
    exposedHeaders: ['set-auth-token'],
  }),
);

// IMPORTANT: mount the Better-Auth handler BEFORE any body parser — it needs the
// raw request stream. (Express 4 wildcard syntax.)
app.all('/api/auth/*', toNodeHandler(auth));

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({status: 'ok', service: 'better-auth', db: Boolean(process.env.DATABASE_URL)});
});

app.listen(port, () => {
  console.log(`[auth] Better-Auth server listening on http://localhost:${port}`);
  console.log(`[auth] Trusted book origin: ${bookOrigin}`);
});
