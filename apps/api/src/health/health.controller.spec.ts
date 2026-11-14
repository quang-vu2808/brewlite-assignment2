import 'reflect-metadata';
import { ServiceUnavailableException } from '@nestjs/common';
import type { DataSource } from 'typeorm';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  const query = jest.fn();
  const controller = new HealthController({ query } as unknown as DataSource);

  beforeEach(() => query.mockReset());

  it('reports healthy after PostgreSQL answers the probe', async () => {
    query.mockResolvedValue([{ result: 1 }]);
    await expect(controller.check()).resolves.toEqual({ status: 'ok', database: 'up' });
    expect(query).toHaveBeenCalledWith('SELECT 1');
  });

  it('returns 503 without exposing the database error', async () => {
    query.mockRejectedValue(new Error('private connection details'));
    const result = controller.check();
    await expect(result).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect(result).rejects.toMatchObject({
      status: 503,
      response: { status: 'error', database: 'down' },
    });
  });

  it('returns 503 when PostgreSQL does not answer promptly', async () => {
    jest.useFakeTimers();
    try {
      query.mockReturnValue(new Promise<never>(() => undefined));
      const assertion = expect(controller.check()).rejects.toMatchObject({ status: 503 });
      await jest.advanceTimersByTimeAsync(2000);
      await assertion;
    } finally {
      jest.useRealTimers();
    }
  });
});
