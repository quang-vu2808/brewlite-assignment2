import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { configureApp } from '../src/configure-app';
import { ProductsModule } from '../src/products/products.module';

describe('Products API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [ProductsModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => app.close());

  it('GET /products returns a JSON product list', async () => {
    const response = await request(app.getHttpServer()).get('/products').expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
    expect(response.body[0]).toEqual(expect.objectContaining({
      id: expect.any(Number),
      name: expect.any(String),
      price: expect.any(Number),
      image: expect.any(String),
    }));
  });

  it('GET /products/:id returns a product', async () => {
    const response = await request(app.getHttpServer()).get('/products/1').expect(200);

    expect(response.body).toEqual(expect.objectContaining({ id: 1, name: expect.any(String) }));
  });

  it('GET /products/:id returns 404 for a missing product', async () => {
    await request(app.getHttpServer()).get('/products/999999').expect(404);
  });
});
