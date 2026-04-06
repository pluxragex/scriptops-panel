import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';

import { PrismaService } from '../../prisma/prisma.service';
import { SshService } from '../../../ssh/ssh.service';
import { WebSocketGateway } from '../../websocket/websocket.gateway';
import { DeploymentJobData } from '../queue.service';

@Processor('deployment')
export class DeploymentProcessor {
  private readonly logger = new Logger(DeploymentProcessor.name);

  constructor(
    private prisma: PrismaService,
    private sshService: SshService,
    private webSocketGateway: WebSocketGateway,
  ) {}

  @Process('deploy')
  async handleDeployment(job: Job<DeploymentJobData>) {
    const { scriptId, type, filePath, repoUrl, version } = job.data;

    this.logger.log(`Начинаем деплоймент скрипта ${scriptId}, тип: ${type}`);

    try {

      await this.updateDeploymentStatus(scriptId, 'IN_PROGRESS', 0);
      await this.notifyProgress(scriptId, 0, 'Начинаем деплоймент...');


      const script = await this.prisma.script.findUnique({
        where: { id: scriptId },
        include: { server: true, owner: true },
      });

      if (!script) {
        throw new Error('Скрипт не найден');
      }


      await this.sshService.createDirectory(
        script.serverId,
        script.pathOnServer,
        'deploy'
      );
      await this.notifyProgress(scriptId, 20, 'Директория создана');


      if (type === 'UPLOAD' && filePath) {
        await this.deployFromUpload(script, filePath);
      } else if (type === 'GIT_PULL' && repoUrl) {
        await this.deployFromGit(script, repoUrl);
      } else {
        throw new Error('Неверный тип деплоймента или отсутствуют необходимые данные');
      }

      await this.notifyProgress(scriptId, 60, 'Код загружен');


      await this.sshService.installDependencies(script.serverId, script.pathOnServer);
      await this.notifyProgress(scriptId, 80, 'Зависимости установлены');


      await this.sshService.createEcosystemConfig(
        script.serverId,
        script.pathOnServer,
        script.pm2Name
      );
      await this.notifyProgress(scriptId, 90, 'Конфигурация PM2 создана');


      await this.prisma.script.update({
        where: { id: scriptId },
        data: {
          status: 'STOPPED',
          version: version || new Date().toISOString(),
        },
      });


      await this.updateDeploymentStatus(scriptId, 'COMPLETED', 100);
      await this.notifyProgress(scriptId, 100, 'Деплоймент завершен успешно');

      this.logger.log(`Деплоймент скрипта ${scriptId} завершен успешно`);

      return { success: true, message: 'Деплоймент завершен успешно' };

    } catch (error) {
      this.logger.error(`Ошибка деплоймента скрипта ${scriptId}:`, error);

      await this.updateDeploymentStatus(scriptId, 'FAILED', 0, error.message);
      await this.notifyProgress(scriptId, 0, `Ошибка: ${error.message}`);

      throw error;
    }
  }

  private async deployFromUpload(script: any, filePath: string) {

    const remoteArchivePath = `${script.pathOnServer}/script.tar.gz`;
    await this.sshService.uploadFile(script.serverId, filePath, remoteArchivePath);


    await this.sshService.extractArchive(script.serverId, remoteArchivePath, script.pathOnServer);
  }

  private async deployFromGit(script: any, repoUrl: string) {

    const cloneCommand = `cd "${script.pathOnServer}" && git clone "${repoUrl}" .`;
    const result = await this.sshService.executeCommand(script.serverId, cloneCommand);

    if (result.code !== 0) {
      throw new Error(`Ошибка клонирования репозитория: ${result.stderr}`);
    }
  }

  private async updateDeploymentStatus(scriptId: string, status: string, progress: number, error?: string) {
    await this.prisma.deployment.updateMany({
      where: { scriptId },
      data: {
        status: status as any,
        progress,
        error,
        ...(status === 'COMPLETED' && { completedAt: new Date() }),
      },
    });
  }

  private async notifyProgress(scriptId: string, progress: number, message: string) {

    const script = await this.prisma.script.findUnique({
      where: { id: scriptId },
      select: { ownerId: true },
    });

    if (script) {

      this.webSocketGateway.emitToUser(script.ownerId, 'deployment-progress', {
        scriptId,
        progress,
        message,
      });
    }
  }
}
