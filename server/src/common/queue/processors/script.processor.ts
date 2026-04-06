import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';

import { PrismaService } from '../../prisma/prisma.service';
import { SshService } from '../../../ssh/ssh.service';
import { WebSocketGateway } from '../../websocket/websocket.gateway';
import { CacheService } from '../../cache/cache.service';
import { ScriptJobData } from '../queue.service';

@Processor('script')
export class ScriptProcessor {
  private readonly logger = new Logger(ScriptProcessor.name);

  constructor(
    private prisma: PrismaService,
    private sshService: SshService,
    private webSocketGateway: WebSocketGateway,
    private cacheService: CacheService,
  ) {}

  @Process('manage')
  async handleScriptManagement(job: Job<ScriptJobData>) {
    const { scriptId, action } = job.data;

    this.logger.log(`Выполняем действие ${action} для скрипта ${scriptId}`);

    try {

      const script = await this.prisma.script.findUnique({
        where: { id: scriptId },
        include: { server: true },
      });

      if (!script) {
        throw new Error('Скрипт не найден');
      }


      switch (action) {
        case 'START':
          await this.startScript(script);
          break;
        case 'STOP':
          await this.stopScript(script);
          break;
        case 'RESTART':
          await this.restartScript(script);
          break;
        case 'RELOAD':
          await this.reloadScript(script);
          break;
        case 'DELETE':
          await this.deleteScript(script);

          break;
        default:
          throw new Error(`Неизвестное действие: ${action}`);
      }


      if (action !== 'DELETE') {
        await this.updateScriptStatus(script);
      }

      this.logger.log(`Действие ${action} для скрипта ${scriptId} выполнено успешно`);


      if (action === 'DELETE') {
        this.webSocketGateway.emitToUser(script.ownerId, 'script-deleted', {
          scriptId,
          action,
        });
      } else {
        this.webSocketGateway.emitToUser(script.ownerId, 'script-status-update', {
          scriptId,
          action,
          status: script.status,
        });
      }

      return { success: true, action, message: `Действие ${action} выполнено успешно` };

    } catch (error) {
      this.logger.error(`Ошибка выполнения действия ${action} для скрипта ${scriptId}:`, error);


      const script = await this.prisma.script.findUnique({
        where: { id: scriptId },
        select: { ownerId: true },
      });

      if (script) {

        this.webSocketGateway.emitToUser(script.ownerId, 'script-error', {
          scriptId,
          action,
          error: error.message,
        });
      }

      throw error;
    }
  }

  private async startScript(script: any) {
    await this.prisma.script.update({
      where: { id: script.id },
      data: { status: 'STARTING' },
    });

    await this.sshService.pm2Start(script.serverId, script.pathOnServer, script.pm2Name);
  }

  private async stopScript(script: any) {
    await this.prisma.script.update({
      where: { id: script.id },
      data: { status: 'STOPPING' },
    });

    await this.sshService.pm2Stop(script.serverId, script.pm2Name);
  }

  private async restartScript(script: any) {
    await this.prisma.script.update({
      where: { id: script.id },
      data: { status: 'STARTING' },
    });

    await this.sshService.pm2Restart(script.serverId, script.pm2Name, script.pathOnServer);
  }

  private async reloadScript(script: any) {
    await this.sshService.pm2Reload(script.serverId, script.pm2Name);
  }

  private async deleteScript(script: any) {
    this.logger.log(`Начинаем удаление скрипта ${script.id}`);


    try {
      this.logger.log(`Удаляем PM2 процесс ${script.pm2Name} на сервере ${script.serverId}`);
      await this.sshService.pm2Delete(script.serverId, script.pm2Name);
      this.logger.log(`PM2 процесс ${script.pm2Name} удален успешно`);
    } catch (error) {
      this.logger.warn(`Не удалось удалить PM2 процесс: ${error.message}`);
    }


    try {
      this.logger.log(`Удаляем директорию ${script.pathOnServer}`);
      const deleteCommand = `rm -rf "${script.pathOnServer}"`;
      await this.sshService.executeCommand(script.serverId, deleteCommand);
      this.logger.log(`Директория ${script.pathOnServer} удалена успешно`);
    } catch (error) {
      this.logger.warn(`Не удалось удалить директорию: ${error.message}`);
    }


    try {
      this.logger.log(`Удаляем запись скрипта ${script.id} из базы данных`);
      await this.prisma.script.delete({
        where: { id: script.id },
      });
      this.logger.log(`Скрипт ${script.id} удален из базы данных успешно`);
    } catch (error) {
      this.logger.error(`Ошибка удаления скрипта из БД: ${error.message}`);
      throw error;
    }
  }

  private async updateScriptStatus(script: any) {
    try {
      const processInfo = await this.sshService.pm2GetProcessInfo(script.serverId, script.pm2Name);

      if (processInfo) {
        await this.prisma.script.update({
          where: { id: script.id },
          data: {
            status: processInfo.status === 'online' ? 'RUNNING' : 'STOPPED',
            pid: processInfo.pid,
            uptime: processInfo.uptime,
          },
        });
      } else {
        await this.prisma.script.update({
          where: { id: script.id },
          data: {
            status: 'STOPPED',
            pid: null,
            uptime: null,
          },
        });
      }
    } catch (error) {
      this.logger.warn(`Не удалось обновить статус скрипта ${script.id}: ${error.message}`);

      await this.prisma.script.update({
        where: { id: script.id },
        data: { status: 'UNKNOWN' },
      });
    }
  }
}
