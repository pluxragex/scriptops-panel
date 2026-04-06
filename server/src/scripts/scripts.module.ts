import { Module, forwardRef } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { ScriptsService } from './scripts.service';
import { ScriptsController } from './scripts.controller';
import { QueueModule } from '../common/queue/queue.module';
import { SshModule } from '../ssh/ssh.module';
import { NotificationsModule } from '../common/notifications/notifications.module';
import { CacheModule } from '../common/cache/cache.module';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';

@Module({
  imports: [
    MulterModule.register({
      dest: './uploads',
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
    }),
    QueueModule,
    SshModule,
    NotificationsModule,
    CacheModule,
  ],
  providers: [ScriptsService, ApiKeyGuard],
  controllers: [ScriptsController],
  exports: [ScriptsService],
})
export class ScriptsModule {}
