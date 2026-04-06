import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { QueueService } from './queue.service';
import { DeploymentProcessor } from './processors/deployment.processor';
import { ScriptProcessor } from './processors/script.processor';
import { ExpiryProcessor } from './processors/expiry.processor';
import { ExpirySchedulerService } from '../scheduler/expiry-scheduler.service';
import { SshModule } from '../../ssh/ssh.module';
import { WebSocketModule } from '../websocket/websocket.module';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: 'deployment' },
      { name: 'script' },
      { name: 'expiry' },
    ),
    forwardRef(() => SshModule),
    forwardRef(() => WebSocketModule),
    PrismaModule,
    NotificationsModule,
  ],
  providers: [QueueService, DeploymentProcessor, ScriptProcessor, ExpiryProcessor, ExpirySchedulerService],
  exports: [QueueService],
})
export class QueueModule {}
