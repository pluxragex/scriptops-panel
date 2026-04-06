import { Module } from '@nestjs/common'
import { ScheduleModule } from '@nestjs/schedule'
import { SchedulerService } from './scheduler.service'
import { PrismaModule } from '../prisma/prisma.module'
import { TemplateUpdateModule } from '../template-update/template-update.module'
import { QueueModule } from '../queue/queue.module'
import { SshModule } from '../../ssh/ssh.module'

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    TemplateUpdateModule,
    QueueModule,
    SshModule,
  ],
  providers: [SchedulerService],
  exports: [SchedulerService],
})
export class SchedulerModule {}

