import 'reflect-metadata';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'node:crypto';
import type { ExecutionContext } from '@nestjs/common';
import type { UsersService } from '../users/users.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

describe('JWT contract', () => {
  const jwt = new JwtService({ secret: randomBytes(32).toString('hex') });
  const user = { id: '11111111-1111-4111-8111-111111111111', email: 'customer@example.invalid', role: 'CUSTOMER', loyaltyPoints: 0 };
  const users = { findById: jest.fn(async () => user) } as unknown as UsersService;
  const guard = new JwtAuthGuard(jwt, users);
  function context(token?: string) {
    return { switchToHttp: () => ({ getRequest: () => ({ headers: { authorization: token ? `Bearer ${token}` : undefined } }) }) } as unknown as ExecutionContext;
  }
  it('accepts a real signed token issued for an existing account', async () => {
    const token = await jwt.signAsync({ sub: user.id }, { expiresIn: '15m' });
    await expect(guard.canActivate(context(token))).resolves.toBe(true);
  });
  it('rejects missing, expired and incorrectly signed tokens with 401', async () => {
    const expired = await jwt.signAsync({ sub: user.id }, { expiresIn: -1 });
    const forged = await new JwtService({ secret: randomBytes(32).toString('hex') }).signAsync({ sub: user.id });
    for (const token of [undefined, expired, forged]) {
      await expect(guard.canActivate(context(token))).rejects.toMatchObject({ status: 401 });
    }
  });
});
