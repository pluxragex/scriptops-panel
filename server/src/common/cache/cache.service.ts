import { Injectable, Inject, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private readonly defaultTtl: number;
  private redis: Redis;

  constructor(
    @Inject('REDIS_CLIENT') private readonly redisClient: Redis,
    private readonly configService: ConfigService,
  ) {
    this.redis = redisClient;
    this.defaultTtl = this.configService.get<number>('CACHE_TTL', 300);
  }

  onModuleInit() {

    if (process.env.LOG_LEVEL === 'debug') {
      this.logger.debug('CacheService initialized');
    }
  }

  onModuleDestroy() {
    if (this.redis) {
      this.redis.disconnect();
    }
  }


  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      if (value) {
        return JSON.parse(value) as T;
      }
      return null;
    } catch (error) {
      this.logger.error(`Ошибка получения из кэша: ${key}`, error);
      return null;
    }
  }


  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      const expiration = ttl || this.defaultTtl;
      await this.redis.setex(key, expiration, serialized);
    } catch (error) {
      this.logger.error(`Ошибка сохранения в кэш: ${key}`, error);
    }
  }


  async delete(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      this.logger.error(`Ошибка удаления из кэша: ${key}`, error);
    }
  }


  async deletePattern(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      this.logger.error(`Ошибка удаления по паттерну: ${pattern}`, error);
    }
  }


  async invalidateScript(scriptId: string): Promise<void> {
    await Promise.all([
      this.delete(`script:${scriptId}`),
      this.deletePattern(`scripts:user:*`),
      this.deletePattern(`scripts:admin:*`),
    ]);
  }


  async invalidateUser(userId: string): Promise<void> {
    await Promise.all([
      this.delete(`user:${userId}`),
      this.deletePattern(`scripts:user:${userId}*`),
      this.deletePattern(`stats:user:${userId}*`),
    ]);
  }


  async invalidateStats(): Promise<void> {
    await this.deletePattern('stats:*');
  }
}

