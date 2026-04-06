import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { WebSocketModule } from '../common/websocket/websocket.module';
import { NotificationsModule } from '../common/notifications/notifications.module';

@Module({
  imports: [ConfigModule, WebSocketModule, NotificationsModule],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
