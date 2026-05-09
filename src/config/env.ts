import { z } from 'zod';

const EnvSchema = z.object({
  API_URL: z.string().url().default('https://api.example.com'),
  SENTRY_DSN: z.string().optional(),
  APP_ENV: z.enum(['development', 'staging', 'production']).default('development'),
});

export const Env = EnvSchema.parse({
  API_URL: process.env.EXPO_PUBLIC_API_URL,
  SENTRY_DSN: process.env.EXPO_PUBLIC_SENTRY_DSN,
  APP_ENV: process.env.EXPO_PUBLIC_APP_ENV,
});

export type EnvType = z.infer<typeof EnvSchema>;
