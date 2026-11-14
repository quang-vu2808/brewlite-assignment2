import { randomBytes } from 'node:crypto';

const password = process.env.TEST_DB_PASSWORD;
if (process.env.NODE_ENV !== 'test' || !password?.trim()) {
  throw new Error('Integration tests require NODE_ENV=test and TEST_DB_PASSWORD.');
}

// Pin the target before importing AppModule so local DB_* settings cannot redirect migrations.
Object.assign(process.env, {
  DB_HOST: '127.0.0.1',
  DB_PORT: '55432',
  DB_NAME: 'brewlite_assignment2_test',
  DB_USER: 'brewlite_integration',
  DB_PASSWORD: password,
  JWT_SECRET: randomBytes(32).toString('hex'),
  WEB_ORIGIN: 'http://localhost:3000',
  PAYMENT_DEMO_ENABLED: 'true',
});
