import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  databaseUrl: process.env.DATABASE_URL ?? '',
  clientUrl: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  saltRounds: parseInt(process.env.PASSWORD_SALT_ROUNDS ?? '10', 10),
  mailFrom: process.env.MAIL_FROM ?? 'no-reply@zhixie.local'
}));
