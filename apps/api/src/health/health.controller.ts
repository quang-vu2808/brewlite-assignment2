import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Controller('health')
export class HealthController {
  constructor(@InjectDataSource() private readonly database: DataSource) {}

  @Get()
  async check() {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        this.database.query('SELECT 1'),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error('Database probe timed out')), 2000);
        }),
      ]);
      return { status: 'ok', database: 'up' };
    } catch {
      throw new ServiceUnavailableException({ status: 'error', database: 'down' });
    } finally {
      clearTimeout(timer);
    }
  }
}
