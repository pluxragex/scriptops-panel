import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { QueueService } from '../common/queue/queue.service';
import { SshService } from '../ssh/ssh.service';
import { TelegramNotificationService } from '../common/notifications/telegram-notification.service';
import { CacheService } from '../common/cache/cache.service';
import { CreateScriptDto } from './dto/create-script.dto';
import { DeployScriptDto } from './dto/deploy-script.dto';
import { User } from '@prisma/client';
import * as path from 'path';
import * as fs from 'fs/promises';

@Injectable()
export class ScriptsService {
  private readonly logger = new Logger(ScriptsService.name);

  constructor(
    private prisma: PrismaService,
    private queueService: QueueService,
    private sshService: SshService,
    private telegramNotificationService: TelegramNotificationService,
    private cacheService: CacheService,
  ) {}


  async getUserScripts(userId: string) {
    const cacheKey = `scripts:user:${userId}`;


    const cached = await this.cacheService.get<any[]>(cacheKey);
    if (cached) {
      return cached;
    }


    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    let scripts;


    if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
      scripts = await this.prisma.script.findMany({
        select: {
          id: true,
          name: true,
          description: true,
          type: true,
          repoUrl: true,
          uploadedPath: true,
          ownerId: true,
          serverId: true,
          pathOnServer: true,
          pm2Name: true,
          status: true,
          pid: true,
          uptime: true,
          version: true,
          expiryDate: true,
          createdAt: true,
          updatedAt: true,
          server: {
            select: {
              id: true,
              name: true,
              host: true,
            },
          },
          _count: {
            select: {
              deployments: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    } else {

      scripts = await this.prisma.script.findMany({
        where: {
          OR: [
            { ownerId: userId },
            {
              userAccess: {
                some: {
                  userId: userId,
                  canView: true,
                },
              },
            },
          ],
        },
        select: {
          id: true,
          name: true,
          description: true,
          type: true,
          repoUrl: true,
          uploadedPath: true,
          ownerId: true,
          serverId: true,
          pathOnServer: true,
          pm2Name: true,
          status: true,
          pid: true,
          uptime: true,
          version: true,
          expiryDate: true,
          createdAt: true,
          updatedAt: true,
          server: {
            select: {
              id: true,
              name: true,
              host: true,
            },
          },
          _count: {
            select: {
              deployments: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    }


    await this.cacheService.set(cacheKey, scripts, 120);

    return scripts;
  }


  private async checkScriptExpiry(script: any): Promise<boolean> {
    if (!script.expiryDate) {
      return true;
    }

    const now = new Date();
    const expiryDate = new Date(script.expiryDate);


    if (script.frozenAt) {
      const frozenAt = new Date(script.frozenAt);

      if (!script.frozenUntil) {
        return true;
      }
      const frozenUntil = new Date(script.frozenUntil);

      if (now <= frozenUntil) {
        return true;
      }

      const freezeDuration = frozenUntil.getTime() - frozenAt.getTime();
      const adjustedExpiry = new Date(expiryDate.getTime() + freezeDuration);
      return now <= adjustedExpiry;
    }

    return now <= expiryDate;
  }


  private async disableExpiredScript(script: any): Promise<void> {
    try {

      const pm2Name = `user-${script.ownerId}-script-${script.id}`;
      await this.sshService.pm2Stop(script.serverId, pm2Name);


      await this.prisma.script.update({
        where: { id: script.id },
        data: {
          status: 'EXPIRED' as any,
          pid: null,
          uptime: null
        }
      });

      this.logger.warn(`Script ${script.id} auto-disabled: expired`);
    } catch (error) {
      this.logger.error(`Ошибка при отключении истекшего скрипта ${script.id}: ${error.message}`);
    }
  }


  async getUserScriptAccess(scriptId: string, userId: string) {
    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });


    if (currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN') {
      return {
        canView: true,
        canStart: true,
        canStop: true,
        canRestart: true,
        canViewLogs: true,
        canManageSettings: true,
        isOwner: false
      };
    }


    const script = await this.prisma.script.findUnique({
      where: { id: scriptId },
      select: { ownerId: true }
    });

    if (!script) {
      throw new NotFoundException('Скрипт не найден');
    }

    if (script.ownerId === userId) {
      return {
        canView: true,
        canStart: true,
        canStop: true,
        canRestart: true,
        canViewLogs: true,
        canManageSettings: true,
        isOwner: true
      };
    }


    const access = await this.prisma.scriptUserAccess.findFirst({
      where: {
        scriptId: scriptId,
        userId: userId
      }
    });

    if (!access) {
      throw new ForbiddenException('Нет доступа к этому скрипту');
    }


    const accessWithSettings = access as any;

    return {
      canView: access.canView,
      canStart: access.canStart,
      canStop: access.canStop,
      canRestart: access.canRestart,
      canViewLogs: access.canViewLogs,
      canManageSettings: accessWithSettings.canManageSettings ?? false,
      isOwner: false
    };
  }


  async getScriptById(scriptId: string, userId: string) {

    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    if (currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN') {

      const script = await this.prisma.script.findUnique({
        where: { id: scriptId },
        include: {
          server: {
            select: {
              id: true,
              name: true,
              host: true,
            },
          },
          owner: {
            select: {
              id: true,
              username: true,
              email: true,
              role: true,
            },
          },
        },
      });

      if (!script) {
        throw new NotFoundException('Скрипт не найден');
      }


      if (!(await this.checkScriptExpiry(script))) {
        await this.disableExpiredScript(script);
        script.status = 'EXPIRED' as any;
      }

      return script;
    } else {

      const script = await this.prisma.$queryRaw`
        SELECT s.*,
               se.id as server_id, se.name as server_name, se.host as server_host,
               u.id as owner_id, u.username as owner_username, u.email as owner_email, u.role as owner_role
        FROM scripts s
        LEFT JOIN servers se ON s.serverId = se.id
        LEFT JOIN users u ON s.ownerId = u.id
        WHERE s.id = ${scriptId}
          AND (s.ownerId = ${userId}
               OR s.id IN (
                 SELECT scriptId
                 FROM script_user_access
                 WHERE userId = ${userId} AND canView = true
               ))
        LIMIT 1
      ` as any[];

      if (script.length === 0) {
        throw new NotFoundException('Скрипт не найден');
      }

      const scriptData = script[0];
      const scriptObj = {
        id: scriptData.id,
        name: scriptData.name,
        description: scriptData.description,
        type: scriptData.type,
        repoUrl: scriptData.repoUrl,
        uploadedPath: scriptData.uploadedPath,
        ownerId: scriptData.ownerId,
        serverId: scriptData.serverId,
        pathOnServer: scriptData.pathOnServer,
        pm2Name: scriptData.pm2Name,
        status: scriptData.status,
        pid: scriptData.pid,
        uptime: scriptData.uptime,
        version: scriptData.version,
        expiryDate: scriptData.expiryDate,
        frozenAt: scriptData.frozenAt,
        frozenUntil: scriptData.frozenUntil,
        ownerFrozenOnce: scriptData.ownerFrozenOnce,
        autoUpdate: scriptData.autoUpdate,
        createdAt: scriptData.createdAt,
        updatedAt: scriptData.updatedAt,
        server: {
          id: scriptData.server_id,
          name: scriptData.server_name,
          host: scriptData.server_host,
        },
        owner: {
          id: scriptData.owner_id,
          username: scriptData.owner_username,
          email: scriptData.owner_email,
          role: scriptData.owner_role,
        },
      };


      if (!(await this.checkScriptExpiry(scriptObj))) {
        await this.disableExpiredScript(scriptObj);
        scriptObj.status = 'EXPIRED';
      }

      return scriptObj;
    }
  }


  async createScript(userId: string, createScriptDto: CreateScriptDto) {
    const { name, description, type, serverId, ownerId, autoUpdate } = createScriptDto;


    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
      throw new ForbiddenException('Только администраторы могут создавать скрипты');
    }


    const scriptOwnerId = ownerId || userId;


    const owner = await this.prisma.user.findUnique({
      where: { id: scriptOwnerId },
      select: { id: true, username: true }
    });

    if (!owner) {
      throw new BadRequestException('Владелец скрипта не найден');
    }


    const server = await this.prisma.server.findUnique({
      where: { id: serverId },
    });

    if (!server || !server.isActive) {
      throw new BadRequestException('Сервер не найден или неактивен');
    }


    const scriptId = `script-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const pathOnServer = `/opt/discord-scripts/${scriptOwnerId}/${scriptId}`;
    const pm2Name = `user-${scriptOwnerId}-script-${scriptId}`;

    const script = await this.prisma.script.create({
      data: {
        id: scriptId,
        name,
        description,
        type: type as any,
        ownerId: scriptOwnerId,
        serverId,
        pathOnServer,
        pm2Name,
        status: 'STOPPED',
        autoUpdate: autoUpdate ?? false,
      },
      include: {
        server: {
          select: {
            id: true,
            name: true,
            host: true,
          },
        },
      },
    });


    if (type !== 'CUSTOM') {
      try {
        await this.copyTemplate(type, scriptId, server, scriptOwnerId);
      } catch (templateError) {

        await this.prisma.script.delete({
          where: { id: scriptId }
        });
        throw new BadRequestException(`Ошибка при создании скрипта: ${templateError.message}`);
      }
    } else {

      try {
        await this.sshService.createDirectory(serverId, pathOnServer);
      } catch (directoryError) {
        this.logger.error(`Ошибка создания директории для скрипта ${scriptId}:`, directoryError);

      }
    }


    await this.logAction(userId, 'SCRIPT_CREATE', scriptId, {
      name,
      type,
      serverId,
      ownerId: scriptOwnerId,
      ownerUsername: owner.username
    });

    return script;
  }


  async deployScript(scriptId: string, userId: string, deployScriptDto: DeployScriptDto) {
    const script = await this.getScriptById(scriptId, userId);


    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    if (script.ownerId !== userId && currentUser?.role !== 'ADMIN' && currentUser?.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Нет прав на деплой этого скрипта');
    }


    const deployment = await this.prisma.deployment.create({
      data: {
        scriptId,
        type: deployScriptDto.type,
        version: deployScriptDto.version || new Date().toISOString(),
        status: 'PENDING',
      },
    });


    const job = await this.queueService.addDeploymentJob({
      scriptId,
      type: deployScriptDto.type,
      filePath: deployScriptDto.filePath,
      repoUrl: deployScriptDto.repoUrl,
      version: deployScriptDto.version,
    });


    await this.logAction(userId, 'SCRIPT_DEPLOY', scriptId, {
      type: deployScriptDto.type,
      deploymentId: deployment.id,
      jobId: job.id,
    });

    return {
      deployment,
      job: {
        id: job.id,
        status: await job.getState(),
      },
    };
  }


  async startScript(scriptId: string, userId: string) {
    const script = await this.getScriptById(scriptId, userId) as any;


    const userAccess = await this.getUserScriptAccess(scriptId, userId);

    if (!userAccess.canStart) {
      throw new ForbiddenException('Нет прав на запуск этого скрипта');
    }


    if (script.frozenAt) {
      const isCurrentlyFrozen = !script.frozenUntil || new Date(script.frozenUntil) > new Date();
      if (isCurrentlyFrozen) {
        throw new BadRequestException('Скрипт заморожен. Разморозьте подписку, чтобы запустить скрипт.');
      }
    }


    if (!(await this.checkScriptExpiry(script))) {
      throw new BadRequestException('Срок действия скрипта истек. Обратитесь к администратору для продления.');
    }

    if (script.status === 'RUNNING') {
      throw new BadRequestException('Скрипт уже запущен');
    }

    if (script.status === 'EXPIRED') {
      throw new BadRequestException('Скрипт истек. Обратитесь к администратору для продления.');
    }


    const job = await this.queueService.addScriptJob({
      scriptId,
      action: 'START',
    });


    await this.logAction(userId, 'SCRIPT_START', scriptId, { jobId: job.id });


    await this.cacheService.invalidateScript(scriptId);
    await this.cacheService.invalidateUser(userId);

    return {
      message: 'Запуск скрипта инициирован',
      job: {
        id: job.id,
        status: await job.getState(),
      },
    };
  }


  async stopScript(scriptId: string, userId: string) {
    const script = await this.getScriptById(scriptId, userId);


    const userAccess = await this.getUserScriptAccess(scriptId, userId);

    if (!userAccess.canStop) {
      throw new ForbiddenException('Нет прав на остановку этого скрипта');
    }

    if (script.status === 'STOPPED') {
      throw new BadRequestException('Скрипт уже остановлен');
    }


    const job = await this.queueService.addScriptJob({
      scriptId,
      action: 'STOP',
    });


    await this.logAction(userId, 'SCRIPT_STOP', scriptId, { jobId: job.id });


    await this.cacheService.invalidateScript(scriptId);
    await this.cacheService.invalidateUser(userId);

    return {
      message: 'Остановка скрипта инициирована',
      job: {
        id: job.id,
        status: await job.getState(),
      },
    };
  }


  async restartScript(scriptId: string, userId: string) {
    const script = await this.getScriptById(scriptId, userId) as any;


    const userAccess = await this.getUserScriptAccess(scriptId, userId);

    if (!userAccess.canRestart) {
      throw new ForbiddenException('Нет прав на перезапуск этого скрипта');
    }


    if (script.frozenAt) {
      const isCurrentlyFrozen = !script.frozenUntil || new Date(script.frozenUntil) > new Date();
      if (isCurrentlyFrozen) {
        throw new BadRequestException('Скрипт заморожен. Разморозьте подписку, чтобы перезапустить скрипт.');
      }
    }


    if (!(await this.checkScriptExpiry(script))) {
      throw new BadRequestException('Срок действия скрипта истек. Обратитесь к администратору для продления.');
    }

    if (script.status === 'EXPIRED') {
      throw new BadRequestException('Скрипт истек. Обратитесь к администратору для продления.');
    }


    const job = await this.queueService.addScriptJob({
      scriptId,
      action: 'RESTART',
    });


    await this.logAction(userId, 'SCRIPT_RESTART', scriptId, { jobId: job.id });


    await this.cacheService.invalidateScript(scriptId);
    await this.cacheService.invalidateUser(userId);

    return {
      message: 'Перезапуск скрипта инициирован',
      job: {
        id: job.id,
        status: await job.getState(),
      },
    };
  }


  async getScriptLogs(scriptId: string, userId: string, lines: number = 200) {

    const script = await this.getScriptById(scriptId, userId);


    const userAccess = await this.getUserScriptAccess(scriptId, userId);

    if (!userAccess.canViewLogs) {
      throw new ForbiddenException('Нет прав на просмотр логов этого скрипта');
    }

    try {
      const pm2Name = `user-${script.ownerId}-script-${scriptId}`;
      const logs = await this.sshService.pm2GetLogs(script.serverId, pm2Name, lines);
      return { logs };
    } catch (error) {
      throw new BadRequestException(`Ошибка получения логов: ${error.message}`);
    }
  }


  async clearScriptLogs(scriptId: string, userId: string) {
    const script = await this.getScriptById(scriptId, userId);


    const userAccess = await this.getUserScriptAccess(scriptId, userId);

    if (!userAccess.isOwner) {

      const currentUser = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true }
      });

      if (currentUser?.role !== 'ADMIN' && currentUser?.role !== 'SUPER_ADMIN') {
        throw new ForbiddenException('Нет прав на очистку логов этого скрипта');
      }
    }

    try {
      const pm2Name = `user-${script.ownerId}-script-${scriptId}`;
      await this.sshService.pm2ClearLogs(script.serverId, pm2Name);
      return { message: 'Логи скрипта очищены' };
    } catch (error) {
      throw new BadRequestException(`Ошибка очистки логов: ${error.message}`);
    }
  }


  async getScriptStatus(scriptId: string, userId: string) {
    const script = await this.getScriptById(scriptId, userId);


    const userAccess = await this.getUserScriptAccess(scriptId, userId);

    if (!userAccess.canView) {
      throw new ForbiddenException('Нет прав на просмотр статуса этого скрипта');
    }

    try {
      const pm2Name = `user-${script.ownerId}-script-${scriptId}`;
      const status = await this.sshService.pm2GetStatus(script.serverId, pm2Name);

      const isRunning = status ? status.pm2_env?.status === 'online' : false;

      return {
        scriptId,
        pm2Name,
        status,
        isRunning
      };
    } catch (error) {
      this.logger.error(`Error getting script status for ${scriptId}: ${error.message}`);
      throw new BadRequestException(`Ошибка получения статуса: ${error.message}`);
    }
  }


  async deleteScript(scriptId: string, userId: string) {
    const script = await this.getScriptById(scriptId, userId);


    const userAccess = await this.getUserScriptAccess(scriptId, userId);

    if (!userAccess.isOwner) {

      const currentUser = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true }
      });

      if (currentUser?.role !== 'ADMIN' && currentUser?.role !== 'SUPER_ADMIN') {
        throw new ForbiddenException('Нет прав на удаление этого скрипта');
      }
    }


    const job = await this.queueService.addScriptJob({
      scriptId,
      action: 'DELETE',
    });


    await this.logAction(userId, 'SCRIPT_DELETE', scriptId, { jobId: job.id });


    await this.cacheService.invalidateScript(scriptId);
    await this.cacheService.invalidateUser(script.ownerId);
    await this.cacheService.invalidateStats();

    return {
      message: 'Удаление скрипта инициировано',
      job: {
        id: job.id,
        status: await job.getState(),
      },
    };
  }


  async getJobStatus(jobId: string, userId: string) {

    let jobStatus = await this.queueService.getDeploymentJobStatus(jobId);
    if (jobStatus) {
      return { type: 'deployment', ...jobStatus };
    }


    jobStatus = await this.queueService.getScriptJobStatus(jobId);
    if (jobStatus) {
      return { type: 'script', ...jobStatus };
    }

    throw new NotFoundException('Задача не найдена');
  }


  async grantScriptAccess(scriptId: string, userId: string, targetUserId: string, permissions: {
    canView?: boolean;
    canStart?: boolean;
    canStop?: boolean;
    canRestart?: boolean;
    canViewLogs?: boolean;
    canManageSettings?: boolean;
  }) {

    const script = await this.prisma.script.findUnique({
      where: { id: scriptId },
      include: {
        owner: {
          select: {
            id: true,
            username: true
          }
        }
      }
    });

    if (!script) {
      throw new NotFoundException('Скрипт не найден');
    }


    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN' && script.ownerId !== userId)) {
      throw new ForbiddenException('Только администраторы и владельцы скриптов могут выдавать доступ к скриптам');
    }


    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId }
    });

    if (!targetUser) {
      throw new NotFoundException('Пользователь не найден');
    }


    await this.prisma.$executeRaw`
      INSERT INTO script_user_access (id, scriptId, userId, grantedBy, canView, canStart, canStop, canRestart, canViewLogs, canManageSettings, createdAt, updatedAt)
      VALUES (${crypto.randomUUID()}, ${scriptId}, ${targetUserId}, ${userId}, ${permissions.canView ?? true}, ${permissions.canStart ?? false}, ${permissions.canStop ?? false}, ${permissions.canRestart ?? false}, ${permissions.canViewLogs ?? false}, ${permissions.canManageSettings ?? false}, NOW(), NOW())
      ON DUPLICATE KEY UPDATE
        canView = ${permissions.canView ?? true},
        canStart = ${permissions.canStart ?? false},
        canStop = ${permissions.canStop ?? false},
        canRestart = ${permissions.canRestart ?? false},
        canViewLogs = ${permissions.canViewLogs ?? false},
        canManageSettings = ${permissions.canManageSettings ?? false},
        grantedBy = ${userId},
        updatedAt = NOW()
    `;


    const access = await this.prisma.$queryRaw`
      SELECT sua.*, u.id as user_id, u.username as user_username, u.email as user_email
      FROM script_user_access sua
      JOIN users u ON sua.userId = u.id
      WHERE sua.scriptId = ${scriptId} AND sua.userId = ${targetUserId}
    ` as any[];


    await this.logAction(userId, 'SCRIPT_ACCESS_GRANT', scriptId, {
      targetUserId,
      targetUsername: targetUser.username,
      permissions
    });


    await this.telegramNotificationService.sendScriptAccessGrantedNotification(
      targetUserId,
      script.name,
      scriptId,
      script.owner.username,
      permissions
    );

    return {
      id: access[0].id,
      scriptId: access[0].scriptId,
      userId: access[0].userId,
      grantedBy: access[0].grantedBy,
      canView: access[0].canView,
      canStart: access[0].canStart,
      canStop: access[0].canStop,
      canRestart: access[0].canRestart,
      canViewLogs: access[0].canViewLogs,
      canManageSettings: access[0].canManageSettings ?? false,
      createdAt: access[0].createdAt,
      updatedAt: access[0].updatedAt,
      user: {
        id: access[0].user_id,
        username: access[0].user_username,
        email: access[0].user_email
      }
    };
  }


  async revokeScriptAccess(scriptId: string, userId: string, targetUserId: string) {

    const script = await this.prisma.script.findUnique({
      where: { id: scriptId },
      include: {
        owner: {
          select: {
            id: true,
            username: true
          }
        }
      }
    });

    if (!script) {
      throw new NotFoundException('Скрипт не найден');
    }


    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN' && script.ownerId !== userId)) {
      throw new ForbiddenException('Только администраторы и владельцы скриптов могут отзывать доступ к скриптам');
    }


    const userInfo = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { username: true }
    });


    await this.prisma.$executeRaw`
      DELETE FROM script_user_access
      WHERE scriptId = ${scriptId} AND userId = ${targetUserId}
    `;


    await this.logAction(userId, 'SCRIPT_ACCESS_REVOKE', scriptId, {
      targetUserId,
      targetUsername: userInfo?.username || 'Unknown'
    });


    await this.cacheService.invalidateScript(scriptId);
    await this.cacheService.invalidateUser(targetUserId);
    await this.cacheService.invalidateUser(userId);


    await this.telegramNotificationService.sendScriptAccessRevokedNotification(
      targetUserId,
      script.name,
      scriptId,
      script.owner.username
    );

    return { message: 'Доступ отозван успешно' };
  }


  async getScriptAccessList(scriptId: string, userId: string) {

    const script = await this.prisma.script.findUnique({
      where: { id: scriptId }
    });

    if (!script) {
      throw new NotFoundException('Скрипт не найден');
    }


    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN' && script.ownerId !== userId)) {
      throw new ForbiddenException('Только администраторы и владельцы скриптов могут просматривать доступы к скриптам');
    }

    const accessList = await this.prisma.$queryRaw`
      SELECT sua.*, u.id as user_id, u.username as user_username, u.email as user_email
      FROM script_user_access sua
      JOIN users u ON sua.userId = u.id
      WHERE sua.scriptId = ${scriptId}
      ORDER BY sua.createdAt DESC
    ` as any[];

    return accessList.map(access => ({
      id: access.id,
      scriptId: access.scriptId,
      userId: access.userId,
      grantedBy: access.grantedBy,
      canView: access.canView,
      canStart: access.canStart,
      canStop: access.canStop,
      canRestart: access.canRestart,
      canViewLogs: access.canViewLogs,
      canManageSettings: (access as any).canManageSettings ?? false,
      createdAt: access.createdAt,
      updatedAt: access.updatedAt,
      user: {
        id: access.user_id,
        username: access.user_username,
        email: access.user_email
      }
    }));
  }


  async searchUsers(query: string, userId: string) {

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    if (!user) {
      this.logger.warn(`Пользователь ${userId} не найден при поиске`);
      throw new ForbiddenException('Пользователь не найден');
    }

    const results = await this.prisma.user.findMany({
      where: {
        AND: [
          {
            OR: [
              { username: { contains: query } },
              { email: { contains: query } }
            ]
          },
          {
            id: { not: userId }
          }
        ]
      },
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true
      },
      take: 20,
      orderBy: { username: 'asc' }
    });


    if (results.length === 0) {
      const resultsWithoutExclusion = await this.prisma.user.findMany({
        where: {
          OR: [
            { username: { contains: query } },
            { email: { contains: query } }
          ]
        },
        select: {
          id: true,
          username: true,
          email: true,
          createdAt: true
        },
        take: 20,
        orderBy: { username: 'asc' }
      });
      return resultsWithoutExclusion;
    }

    return results;
  }


  private async diagnoseServerIssues(server: any) {
    const issues = [];

    try {

      const connectionTest = await this.sshService.executeCommand(server.id, 'echo "CONNECTION_OK"');
      if (connectionTest.code !== 0) {
        issues.push('Не удается подключиться к серверу');
        return issues;
      }


      const scriptsBaseDir = process.env.SCRIPTS_BASE_DIR || '/opt/discord-scripts';
      const baseDirParent = scriptsBaseDir.substring(0, scriptsBaseDir.lastIndexOf('/'));

      const baseDirCheck = await this.sshService.executeCommand(server.id, `test -d ${baseDirParent}`);
      if (baseDirCheck.code !== 0) {
        issues.push(`Директория ${baseDirParent} не существует на сервере`);
      }


      const baseDirPerms = await this.sshService.executeCommand(server.id, `test -w ${baseDirParent}`);
      if (baseDirPerms.code !== 0) {
        issues.push(`Нет прав записи в директорию ${baseDirParent}`);
      }


      const testDirResult = await this.sshService.executeCommand(server.id, `mkdir -p ${scriptsBaseDir}/test-dir && rmdir ${scriptsBaseDir}/test-dir`);
      if (testDirResult.code !== 0) {
        issues.push(`Нет прав для создания поддиректорий в ${scriptsBaseDir}`);
      }


      const templatesBaseDir = process.env.TEMPLATES_BASE_DIR || path.join(process.cwd(), 'templates', 'scripts');
      const templates = ['MCL_Template', 'Weekly_Template', 'Alliance_Template'];
      const missingTemplates = [];

      for (const template of templates) {
        const templatePath = path.join(templatesBaseDir, template);
        try {
          const stats = await fs.stat(templatePath);
          if (!stats.isDirectory()) {
            missingTemplates.push(template);
          }
        } catch (error) {
          if (error.code === 'ENOENT') {
            missingTemplates.push(template);
          }
        }
      }

      if (missingTemplates.length > 0) {
        issues.push(`Отсутствуют локальные шаблоны на сервере сайта: ${missingTemplates.join(', ')} (путь: ${templatesBaseDir})`);
      }

    } catch (error) {
      issues.push(`Ошибка диагностики: ${error.message}`);
    }

    return issues;
  }


  private async copyTemplate(scriptType: string, scriptId: string, server: any, ownerId: string) {
    try {
      let templateName: string;

      switch (scriptType) {
        case 'CYBER_LEAGUE':
          templateName = 'MCL_Template';
          break;
        case 'WEEKLY_CUP':
          templateName = 'Weekly_Template';
          break;
        case 'ALLIANCE_BOT':
          templateName = 'Alliance_Template';
          break;
        default:
          return;
      }


      const templatesBaseDir = process.env.TEMPLATES_BASE_DIR || path.join(process.cwd(), 'templates', 'scripts');
      const localTemplatePath = path.join(templatesBaseDir, templateName);


      try {
        const stats = await fs.stat(localTemplatePath);
        if (!stats.isDirectory()) {
          throw new Error(`Путь ${localTemplatePath} существует, но не является директорией`);
        }
      } catch (error) {
        if (error.code === 'ENOENT') {
          throw new Error(`Шаблон ${templateName} не найден в локальной директории ${localTemplatePath}. Убедитесь, что шаблон существует на сервере сайта.`);
        }
        throw error;
      }


      const scriptsBaseDir = process.env.SCRIPTS_BASE_DIR || '/opt/discord-scripts';
      const targetPath = `${scriptsBaseDir}/${ownerId}/${scriptId}`;
      const baseDir = `${scriptsBaseDir}/${ownerId}`;


      const mkdirResult = await this.sshService.executeCommand(server.id, `mkdir -p ${baseDir} && chmod 755 ${baseDir}`);
      if (mkdirResult.code !== 0) {
        throw new Error(`Не удалось создать базовую директорию ${baseDir}: ${mkdirResult.stderr}. Возможно, нет прав доступа для создания директории. Попробуйте установить переменную окружения SCRIPTS_BASE_DIR на доступную директорию.`);
      }


      const scriptDirResult = await this.sshService.executeCommand(server.id, `mkdir -p ${targetPath}`);
      if (scriptDirResult.code !== 0) {
        throw new Error(`Не удалось создать директорию для скрипта ${targetPath}: ${scriptDirResult.stderr}`);
      }


      if (process.env.LOG_LEVEL === 'debug') {
        this.logger.debug(`Uploading template ${templateName} to ${targetPath}`);
      }
      await this.sshService.uploadDirectory(server.id, localTemplatePath, targetPath);


      const chmodResult = await this.sshService.executeCommand(server.id, `chmod -R 755 ${targetPath}`);
      if (chmodResult.code !== 0) {
        this.logger.warn(`Предупреждение: не удалось установить права доступа для ${targetPath}: ${chmodResult.stderr}`);
      }


      await this.installDependenciesIfNeeded(server.id, targetPath);


      await this.extractZipFilesIfNeeded(server.id, targetPath);


    } catch (error) {
      this.logger.error(`Ошибка копирования шаблона для скрипта ${scriptId}:`, error);


      const issues = await this.diagnoseServerIssues(server);
      const diagnosticInfo = issues.length > 0 ? ` Диагностика: ${issues.join(', ')}` : '';

      throw new Error(`Ошибка копирования шаблона: ${error.message}${diagnosticInfo}`);
    }
  }


  private async installDependenciesIfNeeded(serverId: string, scriptPath: string): Promise<void> {
    try {

      const checkPyResult = await this.sshService.executeCommand(serverId, `test -f "${scriptPath}/startbot.py"`);
      if (checkPyResult.code === 0) {
        if (process.env.LOG_LEVEL === 'debug') {
          this.logger.debug(`Installing Python dependencies for ${scriptPath}`);
        }


        const checkRequirementsResult = await this.sshService.executeCommand(serverId, `test -f "${scriptPath}/requirements.txt"`);
        if (checkRequirementsResult.code === 0) {

          const installCommand = `cd "${scriptPath}" && nohup pip install -r requirements.txt > /dev/null 2>&1 & echo $!`;
          await this.sshService.executeCommand(serverId, installCommand);
        } else {
          if (process.env.LOG_LEVEL === 'debug') {
          this.logger.debug(`requirements.txt not found in ${scriptPath}, skipping Python deps`);
        }
        }
        return;
      }


      const checkJsResult = await this.sshService.executeCommand(serverId, `test -f "${scriptPath}/startbot.js"`);
      if (checkJsResult.code === 0) {
        if (process.env.LOG_LEVEL === 'debug') {
          this.logger.debug(`Installing Node.js dependencies for ${scriptPath}`);
        }


        const checkPackageJsonResult = await this.sshService.executeCommand(serverId, `test -f "${scriptPath}/package.json"`);
        if (checkPackageJsonResult.code === 0) {

          const installCommand = `cd "${scriptPath}" && nohup npm install > /dev/null 2>&1 & echo $!`;
          await this.sshService.executeCommand(serverId, installCommand);
        } else {
          if (process.env.LOG_LEVEL === 'debug') {
            this.logger.debug(`package.json not found in ${scriptPath}, skipping Node.js deps`);
          }
        }
      }
    } catch (error) {

      this.logger.error(`Ошибка при автоматической установке зависимостей для ${scriptPath}:`, error);
    }
  }


  private async extractZipFilesIfNeeded(serverId: string, scriptPath: string): Promise<void> {
    try {

      const findZipCommand = `find "${scriptPath}" -maxdepth 1 -type f -name "*.zip"`;
      const findResult = await this.sshService.executeCommand(serverId, findZipCommand);

      if (findResult.code !== 0) {

        if (process.env.LOG_LEVEL === 'debug') {
          this.logger.debug(`Ошибка поиска .zip файлов в ${scriptPath}: ${findResult.stderr}`);
        }
        return;
      }


      const zipFiles = findResult.stdout
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

      if (zipFiles.length === 0) {
        if (process.env.LOG_LEVEL === 'debug') {
          this.logger.debug(`Не найдено .zip файлов в ${scriptPath}`);
        }
        return;
      }


      for (const zipFile of zipFiles) {
        try {
          if (process.env.LOG_LEVEL === 'debug') {
            this.logger.debug(`Распаковка ${zipFile} в ${scriptPath}`);
          }


          const unzipCommand = `cd "${scriptPath}" && unzip -o "${zipFile}" -d "${scriptPath}"`;
          const unzipResult = await this.sshService.executeCommand(serverId, unzipCommand);

          if (unzipResult.code === 0) {
            if (process.env.LOG_LEVEL === 'debug') {
              this.logger.debug(`Успешно распакован ${zipFile}`);
            }


            try {
              await this.sshService.executeCommand(serverId, `rm -f "${zipFile}"`);
              if (process.env.LOG_LEVEL === 'debug') {
                this.logger.debug(`Удален архив ${zipFile} после успешной распаковки`);
              }
            } catch (deleteError) {

              this.logger.warn(`Не удалось удалить архив ${zipFile} после распаковки: ${deleteError.message}`);
            }
          } else {
            this.logger.warn(`Не удалось распаковать ${zipFile}: ${unzipResult.stderr}`);
          }
        } catch (error) {

          this.logger.error(`Ошибка при распаковке ${zipFile}:`, error);
        }
      }
    } catch (error) {

      this.logger.error(`Ошибка при поиске и распаковке .zip файлов для ${scriptPath}:`, error);
    }
  }


  async getScriptSettings(scriptId: string, userId: string) {

    const script = await this.getScriptById(scriptId, userId);


    const userAccess = await this.getUserScriptAccess(scriptId, userId);

    if (!userAccess.isOwner && !userAccess.canManageSettings) {

      const currentUser = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true }
      });

      if (currentUser?.role !== 'ADMIN' && currentUser?.role !== 'SUPER_ADMIN') {
        throw new ForbiddenException('Только владелец скрипта, пользователь с правом управления настройками или администратор могут просматривать настройки');
      }
    }

    const settings = await this.prisma.scriptSettings.findUnique({
      where: { scriptId },
    });

    return settings;
  }


  async getScriptEnvFile(scriptId: string, userId: string) {
    const script = await this.getScriptById(scriptId, userId);


    if (script.type === 'CUSTOM') {
      await this.ensureScriptDirectory(script.serverId, script.pathOnServer);
    }

    try {
      const envContent = await this.sshService.readEnvFile(script.serverId, script.pathOnServer);
      return { content: envContent };
    } catch (error) {

      return { content: '' };
    }
  }


  async updateScriptEnvFile(scriptId: string, userId: string, envContent: string) {
    const script = await this.getScriptById(scriptId, userId);


    if (script.type === 'CUSTOM') {
      await this.ensureScriptDirectory(script.serverId, script.pathOnServer);
    }

    let finalEnvContent = envContent;

    if (script.type === 'CYBER_LEAGUE') {
      const CAPTCHA_TOKEN_LINE = 'CAPTCHA_API_TOKEN=KKESzW2wBrUyAAB8RgcdtbU7J9gXYPhxjaJP51gYmQzXoP2qx0JgNtJ90teyTpsP';
      const CAPTCHA_URL_LINE = 'CAPTCHA_API_URL=https://fastcaptcha.org/api/v1/ocr/';

      try {
        const lines = envContent.split('\n');
        const botTokenIndex = lines.findIndex(line => line.trim().startsWith('BOT_TOKEN='));

        if (botTokenIndex !== -1) {
          const nextLine = lines[botTokenIndex + 1]?.trim() ?? '';
          const secondNextLine = lines[botTokenIndex + 2]?.trim() ?? '';

          if (nextLine !== CAPTCHA_TOKEN_LINE) {
            lines.splice(botTokenIndex + 1, 0, CAPTCHA_TOKEN_LINE);
          }

          const urlExpectedIndex = botTokenIndex + 2;
          const currentUrlLine = lines[urlExpectedIndex]?.trim() ?? '';

          if (currentUrlLine !== CAPTCHA_URL_LINE) {
            lines.splice(urlExpectedIndex, 0, CAPTCHA_URL_LINE);
          }

          finalEnvContent = lines.join('\n');
        }
      } catch (error) {

        this.logger.error(`Ошибка при добавлении CAPTCHA настроек в .env скрипта ${scriptId}:`, error as any);
      }
    }

    await this.sshService.writeEnvFile(script.serverId, script.pathOnServer, finalEnvContent);

    return { message: '.env файл обновлен' };
  }


  async updateScriptSettings(scriptId: string, userId: string, updateSettingsDto: any) {

    await this.getScriptById(scriptId, userId);


    const userAccess = await this.getUserScriptAccess(scriptId, userId);

    if (!userAccess.isOwner && !userAccess.canManageSettings) {

      const currentUser = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true }
      });

      if (currentUser?.role !== 'ADMIN' && currentUser?.role !== 'SUPER_ADMIN') {
        throw new ForbiddenException('Только владелец скрипта, пользователь с правом управления настройками или администратор могут изменять настройки');
      }
    }

    const { botToken, cyberLeagueSettings, weeklyCupSettings, familyBotSettings } = updateSettingsDto;

    const settings = await this.prisma.scriptSettings.upsert({
      where: { scriptId },
      update: {
        botToken,
        cyberLeagueSettings,
        weeklyCupSettings,
        familyBotSettings,
      },
      create: {
        scriptId,
        botToken,
        cyberLeagueSettings,
        weeklyCupSettings,
        familyBotSettings,
      },
    });


    await this.logAction(userId, 'SCRIPT_SETTINGS_UPDATE', scriptId, {
      hasBotToken: !!botToken,
      hasCyberLeagueSettings: !!cyberLeagueSettings,
      hasWeeklyCupSettings: !!weeklyCupSettings,
      hasFamilyBotSettings: !!familyBotSettings,
    });

    return settings;
  }


  async validateApiKey(scriptId: string, apiKey: string): Promise<boolean> {
    const script = await this.prisma.script.findUnique({
      where: { id: scriptId },
    });

    if (!script) {
      throw new NotFoundException('Скрипт не найден');
    }

    if (script.type !== 'WEEKLY_CUP') {
      throw new BadRequestException('Этот endpoint доступен только для Weekly Cup скриптов');
    }


    try {
      const envContent = await this.sshService.readEnvFile(script.serverId, script.pathOnServer);
      const envApiKey = this.getEnvValue(envContent, 'API_KEY');

      if (!apiKey || envApiKey !== apiKey) {
        throw new ForbiddenException('Неверный API ключ');
      }

      return true;
    } catch (error) {
      if (error instanceof ForbiddenException || error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new ForbiddenException('Не удалось проверить API ключ');
    }
  }


  private getEnvValue(envContent: string, key: string): string {
    const lines = envContent.split('\n');
    for (const line of lines) {
      if (line.trim().startsWith(`${key}=`)) {
        return line.split('=')[1]?.trim() || '';
      }
    }
    return '';
  }


  private async logAction(userId: string, actionType: string, scriptId: string, details?: any) {
    await this.prisma.auditLog.create({
      data: {
        actorId: userId,
        actionType: actionType as any,
        targetScriptId: scriptId,
        details: details || {},
      },
    });
  }


  private async ensureScriptDirectory(serverId: string, scriptPath: string): Promise<void> {
    try {

      const checkCommand = `test -d "${scriptPath}" && echo "exists" || echo "not_exists"`;
      const checkResult = await this.sshService.executeCommand(serverId, checkCommand);

      if (checkResult.stdout.trim() === 'not_exists') {

        const parentDir = scriptPath.substring(0, scriptPath.lastIndexOf('/'));
        const parentCheckCommand = `test -d "${parentDir}" && echo "exists" || echo "not_exists"`;
        const parentCheckResult = await this.sshService.executeCommand(serverId, parentCheckCommand);

        if (parentCheckResult.stdout.trim() === 'not_exists') {
          await this.sshService.createDirectory(serverId, parentDir);
        }


        await this.sshService.createDirectory(serverId, scriptPath);
      }
    } catch (error) {
      this.logger.error(`Ошибка при проверке/создании директории ${scriptPath}:`, error);
      throw error;
    }
  }


  async freezeScript(scriptId: string, userId: string) {
    const script = await this.getScriptById(scriptId, userId) as any;


    const userAccess = await this.getUserScriptAccess(scriptId, userId);
    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN';
    const isOwner = userAccess.isOwner;

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('Только владелец скрипта или администратор могут замораживать подписку');
    }


    if (isOwner && !isAdmin && script.ownerFrozenOnce) {
      throw new BadRequestException('Вы уже использовали возможность заморозки для этого скрипта. Лимит сбросится при обновлении срока действия администратором.');
    }


    if (script.frozenAt && (!script.frozenUntil || new Date(script.frozenUntil) > new Date())) {
      throw new BadRequestException('Скрипт уже заморожен');
    }

    const now = new Date();


    if (script.status === 'RUNNING' || script.status === 'STARTING') {
      try {
        await this.sshService.pm2Stop(script.serverId, script.pm2Name);
        this.logger.log(`Script ${scriptId} stopped due to freeze`);
      } catch (error) {
        this.logger.warn(`Failed to stop script ${scriptId} during freeze: ${error.message}`);

      }
    }

    const updatedScript = await this.prisma.script.update({
      where: { id: scriptId },
      data: {
        frozenAt: now,
        frozenUntil: null,
        ownerFrozenOnce: isOwner && !isAdmin ? true : script.ownerFrozenOnce,
        status: 'STOPPED' as any,
        pid: null,
        uptime: null,
      } as any
    });


    await this.logAction(userId, 'SCRIPT_FREEZE', scriptId, {
      frozenAt: now,
      frozenByOwner: isOwner && !isAdmin,
      wasRunning: script.status === 'RUNNING',
    });


    await this.cacheService.invalidateScript(scriptId);
    await this.cacheService.invalidateUser(userId);

    return {
      message: 'Подписка заморожена. Скрипт остановлен и не может быть запущен до разморозки.',
      script: updatedScript
    };
  }


  async unfreezeScript(scriptId: string, userId: string) {
    const script = await this.getScriptById(scriptId, userId) as any;


    const userAccess = await this.getUserScriptAccess(scriptId, userId);
    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN';
    const isOwner = userAccess.isOwner;

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('Только владелец скрипта или администратор могут размораживать подписку');
    }


    if (!script.frozenAt) {
      throw new BadRequestException('Скрипт не заморожен');
    }


    const isCurrentlyFrozen = !script.frozenUntil || new Date(script.frozenUntil) > new Date();
    if (!isCurrentlyFrozen) {
      throw new BadRequestException('Скрипт уже разморожен (срок заморозки истек)');
    }

    const updatedScript = await this.prisma.script.update({
      where: { id: scriptId },
      data: {
        frozenAt: null,
        frozenUntil: null,

      } as any
    });


    await this.logAction(userId, 'SCRIPT_UNFREEZE', scriptId, {
      unfrozenAt: new Date(),
      frozenByOwner: script.ownerFrozenOnce,
    });


    await this.cacheService.invalidateScript(scriptId);
    await this.cacheService.invalidateUser(userId);

    return {
      message: 'Подписка разморожена. Время подписки снова будет убавляться.',
      script: updatedScript
    };
  }


  async toggleAutoUpdate(scriptId: string, userId: string, autoUpdate: boolean) {
    const script = await this.getScriptById(scriptId, userId);


    const userAccess = await this.getUserScriptAccess(scriptId, userId);

    if (!userAccess.isOwner) {
      const currentUser = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true }
      });

      if (currentUser?.role !== 'ADMIN' && currentUser?.role !== 'SUPER_ADMIN') {
        throw new ForbiddenException('Только владелец скрипта или администратор могут изменять настройки автообновления');
      }
    }


    if (autoUpdate && script.type === 'CUSTOM') {
      throw new BadRequestException('Автообновление доступно только для скриптов на основе шаблонов');
    }

    const updatedScript = await this.prisma.script.update({
      where: { id: scriptId },
      data: { autoUpdate }
    });


    await this.logAction(userId, 'SCRIPT_SETTINGS_UPDATE', scriptId, {
      autoUpdate,
      changedBy: userId
    });

    return updatedScript;
  }
}
