import { Module, forwardRef } from '@nestjs/common';
import { ReplyBotService } from './reply-bot.service';
import { ReplyBotController } from './reply-bot.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { SshModule } from '../../ssh/ssh.module';
import { ScriptsModule } from '../../scripts/scripts.module';
import { ApiKeyGuard } from '../../auth/guards/api-key.guard';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => SshModule),
    forwardRef(() => ScriptsModule),
  ],
  controllers: [ReplyBotController],
  providers: [ReplyBotService, ApiKeyGuard],
  exports: [ReplyBotService],
})
export class ReplyBotModule {}

