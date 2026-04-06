import { Injectable, Logger, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import Redis from 'ioredis';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  async check() {
    const checks = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: await this.checkDatabase(),
      redis: await this.checkRedis(),
      memory: this.getMemoryUsage(),
    };

    const isHealthy = checks.database.status === 'ok' && checks.redis.status === 'ok';

    return {
      ...checks,
      status: isHealthy ? 'ok' : 'degraded',
    };
  }

  async ready() {
    const checks = {
      status: 'ok',
      database: await this.checkDatabase(),
      redis: await this.checkRedis(),
    };

    const isReady = checks.database.status === 'ok' && checks.redis.status === 'ok';

    return {
      ...checks,
      status: isReady ? 'ready' : 'not ready',
    };
  }

  private async checkDatabase() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok' };
    } catch (error) {
      this.logger.error('Database health check failed', error);
      return { status: 'error', error: error.message };
    }
  }

  private async checkRedis() {
    try {
      await this.redis.ping();
      return { status: 'ok' };
    } catch (error) {
      this.logger.error('Redis health check failed', error);
      return { status: 'error', error: error.message };
    }
  }

  private getMemoryUsage() {
    const usage = process.memoryUsage();
    return {
      rss: `${Math.round(usage.rss / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)}MB`,
      external: `${Math.round(usage.external / 1024 / 1024)}MB`,
    };
  }
}

