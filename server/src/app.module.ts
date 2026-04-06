import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';


import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ScriptsModule } from './scripts/scripts.module';
import { AdminModule } from './admin/admin.module';
import { SshModule } from './ssh/ssh.module';
import { NewsModule } from './news/news.module';
import { WebSocketModule } from './common/websocket/websocket.module';
import { QueueModule } from './common/queue/queue.module';
import { LoggerModule } from './common/logger/logger.module';
import { ReplyBotModule } from './common/reply-bot/reply-bot.module';
import { TemplateUpdateModule } from './common/template-update/template-update.module';
import { NotificationsModule } from './common/notifications/notifications.module';
import { CacheModule } from './common/cache/cache.module';
import { HealthModule } from './common/health/health.module';
import { SchedulerModule } from './common/scheduler/scheduler.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { SessionActivityInterceptor } from './common/interceptors/session-activity.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { CsrfMiddleware } from './common/middleware/csrf.middleware';

@Module({
  imports: [

    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),


    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            ttl: (configService.get<number>('RATE_LIMIT_TTL') || 60) * 1000,
            limit: configService.get<number>('RATE_LIMIT_LIMIT') || 100,
          },
        ],
      }),
    }),


    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL');
        if (redisUrl) {

          const url = new URL(redisUrl);
          return {
            redis: {
              host: url.hostname,
              port: parseInt(url.port) || 6379,
              password: url.password || configService.get<string>('REDIS_PASSWORD'),
            },
          };
        }

        return {
          redis: {
            host: configService.get<string>('REDIS_HOST') || 'localhost',
            port: parseInt(configService.get<string>('REDIS_PORT') || '6379'),
            password: configService.get<string>('REDIS_PASSWORD'),
          },
        };
      },
    }),


    ScheduleModule.forRoot(),


    PrismaModule,
    LoggerModule,
    CacheModule,
    HealthModule,
    WebSocketModule,
    QueueModule,
    ReplyBotModule,
    TemplateUpdateModule,
    NotificationsModule,
    SchedulerModule,


    AuthModule,
    UsersModule,
    ScriptsModule,
    AdminModule,
    SshModule,
    NewsModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: SessionActivityInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(CsrfMiddleware)
      .forRoutes('*');
  }
}
