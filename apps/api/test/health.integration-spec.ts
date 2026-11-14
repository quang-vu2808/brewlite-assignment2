import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';

describe('Health with the integration database', () => {
  let app: INestApplication | undefined;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  }, 60_000);

  afterAll(async () => {
    await app?.close();
  });

  it('answers without authentication when PostgreSQL is reachable', async () => {
    await request(app!.getHttpServer())
      .get('/health')
      .expect(200, { status: 'ok', database: 'up' });
  });
});
