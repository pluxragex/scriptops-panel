import { Module } from '@nestjs/common';
import { TelegramNotificationService } from './telegram-notification.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [TelegramNotificationService],
  exports: [TelegramNotificationService],
})
export class NotificationsModule {}

