import { Module } from '@nestjs/common';
import { TemplateUpdateService } from './template-update.service';
import { PrismaModule } from '../prisma/prisma.module';
import { SshModule } from '../../ssh/ssh.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, SshModule, NotificationsModule],
  providers: [TemplateUpdateService],
  exports: [TemplateUpdateService],
})
export class TemplateUpdateModule {}

