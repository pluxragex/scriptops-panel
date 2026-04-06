import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { QueueModule } from '../common/queue/queue.module';
import { SshModule } from '../ssh/ssh.module';
import { NewsModule } from '../news/news.module';
import { NotificationsModule } from '../common/notifications/notifications.module';
import { SchedulerModule } from '../common/scheduler/scheduler.module';

@Module({
  imports: [QueueModule, SshModule, NewsModule, NotificationsModule, SchedulerModule],
  providers: [AdminService],
  controllers: [AdminController],
  exports: [AdminService],
})
export class AdminModule {}
