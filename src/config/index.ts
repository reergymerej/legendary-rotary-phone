import { z } from 'zod';

const configSchema = z.object({
  port: z.number().default(3000),
  nodeEnv: z.enum(['development', 'test', 'production']).default('development'),
  databaseUrl: z.string(),
  fixedTimeForTests: z.string().optional(),
});

export const config = configSchema.parse({
  port: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL,
  fixedTimeForTests: process.env.FIXED_TIME_FOR_TESTS,
});