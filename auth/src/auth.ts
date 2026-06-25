import {betterAuth} from 'better-auth';
import {Pool} from 'pg';

/**
 * Better-Auth configuration.
 *
 * Email/password auth backed by the same Neon Postgres database. At sign-up we
 * collect the reader's software & hardware background as additional user fields —
 * these drive per-chapter personalization across the book.
 */
const bookOrigin = process.env.BOOK_ORIGIN || 'http://localhost:3000';

export const auth = betterAuth({
  baseURL: process.env.AUTH_BASE_URL || 'http://localhost:3001',
  secret: process.env.BETTER_AUTH_SECRET || 'dev-secret-change-me',

  database: new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('neon.tech') ? {rejectUnauthorized: false} : undefined,
  }),

  emailAndPassword: {
    enabled: true,
    // Hackathon convenience — no email verification step.
    requireEmailVerification: false,
    minPasswordLength: 8,
  },

  // Extra profile fields captured at signup, used to personalize content.
  user: {
    additionalFields: {
      softwareBackground: {type: 'string', required: false, input: true},
      hardwareBackground: {type: 'string', required: false, input: true},
      experienceLevel: {type: 'string', required: false, input: true},
    },
  },

  // Allow the book (and deployed GitHub Pages site) to call us with cookies.
  trustedOrigins: [
    bookOrigin,
    ...(process.env.EXTRA_TRUSTED_ORIGINS?.split(',').map((s) => s.trim()).filter(Boolean) ?? []),
  ],

  advanced: {
    // Cross-site cookies (book on github.io, auth on a different host) need SameSite=None.
    defaultCookieAttributes: {
      sameSite: 'none',
      secure: true,
    },
  },
});
