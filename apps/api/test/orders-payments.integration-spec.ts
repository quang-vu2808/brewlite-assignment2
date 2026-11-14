import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource, type EntitySubscriberInterface } from 'typeorm';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';
import { OrderEntity } from '../src/orders/entities/order.entity';
import { OrderItemEntity } from '../src/orders/entities/order-item.entity';
import { PaymentEntity } from '../src/payments/payment.entity';

describe('Orders and payments with PostgreSQL', () => {
  let app: INestApplication | undefined;
  let db: DataSource;
  let owner: { id: string; token: string };
  let other: typeof owner;
  const item = { productId: 1, size: 'L', toppings: ['pearls'], quantity: 2 };
  const total = 80_000;

  const http = () => request(app!.getHttpServer());

  async function registerAndLogin() {
    const email = `integration-${randomUUID()}@example.invalid`;
    const credentials = { email, password: `Test1!${randomUUID()}` };
    const registered = await http().post('/auth/register').send(credentials).expect(201);
    const login = await http().post('/auth/login').send(credentials).expect(201);
    const { accessToken, user } = login.body as { accessToken: string; user: { id: string } };
    expect(registered.body).toMatchObject({ id: user.id, email });
    return { id: user.id, token: accessToken };
  }

  const orderRequest = (token = owner.token) =>
    http().post('/orders').set('Authorization', `Bearer ${token}`);

  async function createOrder() {
    const result = await orderRequest().send({ items: [item] }).expect(201);
    return result.body as { id: string; totalAmount: number };
  }

  const pay = (orderId: string, key: string, token = owner.token, method = 'WALLET', simulateFailure = false) =>
    http().post('/payments')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', key)
      .send({ orderId, method, simulateFailure });

  const orders = () => db.getRepository(OrderEntity);
  const payments = () => db.getRepository(PaymentEntity);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.listen(0, '127.0.0.1');
    db = app.get(DataSource);
    owner = await registerAndLogin();
    other = await registerAndLogin();
  }, 60_000);

  afterAll(async () => {
    await app?.close();
  });

  it('registers, logs in and authenticates with the issued JWT', async () => {
    await http().get('/auth/me').set('Authorization', `Bearer ${owner.token}`)
      .expect(200).expect(({ body }) => expect(body).toMatchObject({ id: owner.id }));
    await http().get('/auth/me').expect(401);
  });

  it('stores the order and item at the server-calculated price', async () => {
    const order = await createOrder();
    expect(order.totalAmount).toBe(total);
    await expect(orders().findOneOrFail({ where: { id: order.id }, relations: { items: true } }))
      .resolves.toMatchObject({
        userId: owner.id, status: 'PENDING', totalAmount: total,
        items: [{ productId: 1, size: 'L', quantity: 2, unitPrice: 40_000, lineTotal: total }],
      });
  });

  it.each([
    ['empty cart', { items: [] }, 400],
    ['invalid quantity', { items: [{ ...item, quantity: 0 }] }, 400],
    ['client-supplied price', { items: [{ ...item, unitPrice: 1 }], totalAmount: 1 }, 400],
    ['unknown product', { items: [{ ...item, productId: 999_999 }] }, 404],
  ])('rejects %s without saving an order', async (_name, body, status) => {
    const before = await orders().countBy({ userId: owner.id });
    await orderRequest().send(body).expect(status);
    await expect(orders().countBy({ userId: owner.id })).resolves.toBe(before);
  });

  it('prevents another customer from reading or paying the order', async () => {
    const { id } = await createOrder();
    await http().get(`/orders/${id}`).set('Authorization', `Bearer ${other.token}`).expect(404);
    await pay(id, randomUUID(), other.token).expect(404);
    await expect(payments().countBy({ orderId: id })).resolves.toBe(0);
    await expect(orders().findOneByOrFail({ id })).resolves.toMatchObject({ status: 'PENDING' });
  });

  it('persists a successful payment and marks the order PAID', async () => {
    const { id } = await createOrder();
    const key = randomUUID();
    await pay(id, key).expect(201);
    await expect(payments().findOneByOrFail({ orderId: id, idempotencyKey: key }))
      .resolves.toMatchObject({ userId: owner.id, amount: total, status: 'SUCCESS' });
    await expect(orders().findOneByOrFail({ id })).resolves.toMatchObject({ status: 'PAID' });
  });

  it('persists failure and accepts a retry on the same order with a new key', async () => {
    const { id } = await createOrder();
    const key = randomUUID();
    await pay(id, key, owner.token, 'CARD', true).expect(201);
    await expect(payments().findOneByOrFail({ orderId: id, idempotencyKey: key }))
      .resolves.toMatchObject({ amount: total, status: 'FAILED' });
    await expect(orders().findOneByOrFail({ id })).resolves.toMatchObject({ status: 'PAYMENT_FAILED' });
    await pay(id, randomUUID(), owner.token, 'CARD').expect(201);
    await expect(orders().findOneByOrFail({ id })).resolves.toMatchObject({ status: 'PAID' });
    await expect(payments().countBy({ orderId: id })).resolves.toBe(2);
  });

  it('replays the saved response and rejects the same key with a different payload', async () => {
    const { id } = await createOrder();
    const key = randomUUID();
    const first = await pay(id, key).expect(201);
    await pay(id, key).expect(201, first.body);
    await pay(id, key, owner.token, 'CARD').expect(409);
    await expect(payments().countBy({ orderId: id })).resolves.toBe(1);
  });

  it('serializes two simultaneous attempts with different keys', async () => {
    const { id } = await createOrder();
    const results = await Promise.all([pay(id, randomUUID()), pay(id, randomUUID())]);
    expect(results.map(({ status }) => status).sort((a, b) => a - b)).toEqual([201, 409]);
    await expect(payments().countBy({ orderId: id })).resolves.toBe(1);
    await expect(orders().findOneByOrFail({ id })).resolves.toMatchObject({ status: 'PAID' });
  });

  it('rolls back an HTTP payment when a database constraint fails after the insert', async () => {
    const { id } = await createOrder();
    const key = randomUUID();
    const subscriber: EntitySubscriberInterface<PaymentEntity> = {
      listenTo: () => PaymentEntity,
      async afterInsert(event) {
        if (event.entity.orderId === id) {
          // The real PostgreSQL CHECK constraint fails inside the payment transaction.
          await event.manager.update(OrderEntity, id, { totalAmount: -1 });
        }
      },
    };
    db.subscribers.push(subscriber);
    try {
      await pay(id, key).expect(500);
      await expect(payments().countBy({ orderId: id })).resolves.toBe(0);
      await expect(orders().findOneByOrFail({ id }))
        .resolves.toMatchObject({ status: 'PENDING', totalAmount: total });
    } finally {
      db.subscribers.splice(db.subscribers.indexOf(subscriber), 1);
    }
    await pay(id, key).expect(201);
  });

  it('enforces the item foreign key and rolls back earlier writes in the transaction', async () => {
    const id = randomUUID();
    await expect(db.transaction(async (manager) => {
      await manager.insert(OrderEntity, { id, userId: owner.id, totalAmount: total });
      await manager.insert(OrderItemEntity, {
        orderId: randomUUID(), productId: 1, productName: 'Fixture',
        size: 'S', quantity: 1, unitPrice: 25_000, lineTotal: 25_000,
      });
    })).rejects.toMatchObject({ driverError: { code: '23503' } });
    await expect(orders().countBy({ id })).resolves.toBe(0);
  });

  it('enforces the unique user and idempotency key index in PostgreSQL', async () => {
    const { id } = await createOrder();
    const key = randomUUID();
    await pay(id, key).expect(201);
    const { method, status, amount } = await payments().findOneByOrFail({ orderId: id });
    await expect(payments().insert({
      orderId: id, userId: owner.id, idempotencyKey: key, method, status, amount,
    })).rejects.toMatchObject({ driverError: { code: '23505' } });
    await expect(payments().countBy({ orderId: id })).resolves.toBe(1);
  });
});
