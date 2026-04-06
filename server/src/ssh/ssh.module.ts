import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SshService } from './ssh.service';
import { SshController } from './ssh.controller';

@Module({
  imports: [ConfigModule],
  providers: [SshService],
  controllers: [SshController],
  exports: [SshService],
})
export class SshModule {}
