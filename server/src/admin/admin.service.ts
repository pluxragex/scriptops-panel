import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { QueueService } from '../common/queue/queue.service';
import { SshService } from '../ssh/ssh.service';
import { IssueScriptDto } from './dto/issue-script.dto';
import { ExtendScriptDto } from './dto/extend-script.dto';
import { CreateServerDto } from './dto/create-server.dto';
import { UpdateServerDto } from './dto/update-server.dto';
import { UpdateServerKeyDto } from './dto/update-server-key.dto';
import { CreateServerKeyDto } from './dto/create-server-key.dto';
import { ChangeUserPasswordDto } from './dto/change-user-password.dto';
import { CreateScheduledTaskDto } from './dto/create-scheduled-task.dto';
import { UpdateScheduledTaskDto } from './dto/update-scheduled-task.dto';
import { NewsService } from '../news/news.service';
import { TelegramNotificationService } from '../common/notifications/telegram-notification.service';
import { SchedulerService } from '../common/scheduler/scheduler.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private prisma: PrismaService,
    private queueService: QueueService,
    private sshService: SshService,
    private newsService: NewsService,
    private telegramNotificationService: TelegramNotificationService,
    private schedulerService: SchedulerService,
  ) {}

  async getAllUsers(page: number = 1, limit: number = 20, search?: string) {
    try {
      const safeLimit = Math.min(limit, 1000);
      const safePage = Math.max(page, 1);
      const skip = (safePage - 1) * safeLimit;

      const trimmedSearch = search?.trim();
      const where =
        trimmedSearch && trimmedSearch.length > 0
          ? {
              OR: [
                {
                  email: {
                    contains: trimmedSearch,
                  },
                },
                {
                  username: {
                    contains: trimmedSearch,
                  },
                },
                {
                  id: {
                    contains: trimmedSearch,
                  },
                },
              ],
            }
          : undefined;

      const [users, total] = await Promise.all([
        this.prisma.user.findMany({
          skip,
          take: safeLimit,
          where,
          select: {
            id: true,
            email: true,
            username: true,
            role: true,
            isActive: true,
            isBlocked: true,
            emailVerified: true,
            createdAt: true,
            _count: {
              select: {
                scripts: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.user.count({ where }),
      ]);

      return {
        data: users,
        pagination: {
          page: safePage,
          limit: safeLimit,
          total,
          pages: Math.ceil(total / safeLimit),
        },
      };
    } catch (error) {
      this.logger.error(`Error in getAllUsers: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getUserById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        isActive: true,
        isBlocked: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        scripts: {
          include: {
            server: {
              select: {
                id: true,
                name: true,
                host: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    return user;
  }

  async toggleUserBlock(userId: string, adminId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
      throw new ForbiddenException('Нельзя заблокировать администратора');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { isBlocked: !user.isBlocked },
      select: {
        id: true,
        email: true,
        username: true,
        isBlocked: true,
      },
    });

    await this.logAction(adminId, user.isBlocked ? 'USER_UNBLOCK' : 'USER_BLOCK', userId, {
      previousStatus: user.isBlocked,
      newStatus: !user.isBlocked,
    });

    return updatedUser;
  }

  async changeUserRole(userId: string, newRole: string, adminId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    if (user.role === 'SUPER_ADMIN') {
      throw new ForbiddenException('Нельзя изменить роль супер-администратора');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { role: newRole as any },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
      },
    });

    await this.logAction(adminId, 'USER_ROLE_CHANGE', userId, {
      previousRole: user.role,
      newRole,
    });

    return updatedUser;
  }

  async changeUserPassword(userId: string, changePasswordDto: ChangeUserPasswordDto, adminId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    const hashedPassword = await bcrypt.hash(changePasswordDto.newPassword, 10);
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
      },
    });

    await this.logAction(adminId, 'USER_PASSWORD_CHANGE', userId, {
      changedBy: adminId,
      reason: changePasswordDto.reason,
      timestamp: new Date().toISOString(),
    });

    if (process.env.LOG_LEVEL === 'debug') {
      this.logger.debug(`Password changed: user ${userId} by admin ${adminId}`);
    }

    await this.telegramNotificationService.sendPasswordChangedNotification(
      userId,
      undefined,
      undefined,
      true,
    );

    return updatedUser;
  }

  async createUser(createUserDto: { email: string; username: string; password: string; role?: string }, adminId: string) {
    const { email, username, password, role = 'USER' } = createUserDto;

    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { username },
        ],
      },
    });

    if (existingUser) {
      throw new BadRequestException('Пользователь с таким email или username уже существует');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await this.prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        role: role as any,
        emailVerified: true,
      },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        createdAt: true,
      },
    });

    await this.logAction(adminId, 'USER_CREATE', user.id, {
      email,
      username,
      role,
    });

    return user;
  }

  async getUserScripts(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    const scripts = await this.prisma.script.findMany({
      where: { ownerId: userId },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        server: {
          select: {
            id: true,
            name: true,
            host: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return scripts;
  }

  async getAllScripts(page: number = 1, limit: number = 20, search?: string) {
    try {
      const safeLimit = Math.min(limit, 1000);
      const safePage = Math.max(page, 1);
      const skip = (safePage - 1) * safeLimit;

      const trimmedSearch = search?.trim();
      const where =
        trimmedSearch && trimmedSearch.length > 0
          ? {
              OR: [
                {
                  name: {
                    contains: trimmedSearch,
                  },
                },
                {
                  id: {
                    contains: trimmedSearch,
                  },
                },
                {
                  owner: {
                    is: {
                      OR: [
                        {
                          username: {
                            contains: trimmedSearch,
                          },
                        },
                        {
                          email: {
                            contains: trimmedSearch,
                          },
                        },
                      ],
                    },
                  },
                },
              ],
            }
          : undefined;

      const [scripts, total] = await Promise.all([
        this.prisma.script.findMany({
          skip,
          take: safeLimit,
          where,
          include: {
            owner: {
              select: {
                id: true,
                username: true,
                email: true,
              },
            },
            server: {
              select: {
                id: true,
                name: true,
                host: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.script.count({ where }),
      ]);

      return {
        data: scripts,
        pagination: {
          page: safePage,
          limit: safeLimit,
          total,
          pages: Math.ceil(total / safeLimit),
        },
      };
    } catch (error) {
      this.logger.error(`Error in getAllScripts: ${error.message}`, error.stack);
      throw error;
    }
  }

  async issueScript(scriptId: string, issueScriptDto: IssueScriptDto, adminId: string) {
    const { userId, serverId, expiryDays } = issueScriptDto;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    const server = await this.prisma.server.findUnique({
      where: { id: serverId },
    });

    if (!server || !server.isActive) {
      throw new BadRequestException('Сервер не найден или неактивен');
    }

    const existingScript = await this.prisma.script.findUnique({
      where: { id: scriptId },
    });

    if (existingScript) {
      throw new BadRequestException('Скрипт с таким ID уже существует');
    }

    const pathOnServer = `/opt/discord-scripts/${userId}/${scriptId}`;
    const pm2Name = `user-${userId}-script-${scriptId}`;

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + expiryDays);

    const script = await this.prisma.script.create({
      data: {
        id: scriptId,
        name: `Script ${scriptId}`,
        ownerId: userId,
        serverId,
        pathOnServer,
        pm2Name,
        status: 'STOPPED',
        expiryDate,
      },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        server: {
          select: {
            id: true,
            name: true,
            host: true,
          },
        },
      },
    });

    try {
      await this.sshService.createDirectory(serverId, pathOnServer);
    } catch (error) {
      this.logger.error(`Ошибка создания директории для скрипта ${scriptId}:`, error);
    }

    await this.logAction(adminId, 'SCRIPT_ISSUE', scriptId, {
      userId,
      serverId,
      expiryDays,
    });

    return script;
  }

  async revokeScript(scriptId: string, adminId: string) {
    const script = await this.prisma.script.findUnique({
      where: { id: scriptId },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
          },
        },
        server: true,
      },
    });

    if (!script) {
      throw new NotFoundException('Скрипт не найден');
    }

    try {
      const job = await this.queueService.addScriptJob({
        scriptId,
        action: 'DELETE',
      });

      await this.logAction(adminId, 'SCRIPT_REVOKE', scriptId, {
        ownerId: script.ownerId,
        jobId: job.id,
      });

      return {
        message: 'Отзыв скрипта инициирован',
        job: {
          id: job.id,
          status: await job.getState(),
        },
      };
    } catch (queueError) {
      this.logger.warn('Очередь недоступна, удаляем скрипт напрямую:', queueError.message);

      await this.deleteScriptDirectly(script);

      await this.logAction(adminId, 'SCRIPT_REVOKE', scriptId, {
        ownerId: script.ownerId,
        method: 'direct',
      });

      return {
        message: 'Скрипт отозван напрямую',
      };
    }
  }

  private async deleteScriptDirectly(script: any) {
    try {
      await this.sshService.pm2Delete(script.serverId, script.pm2Name);
    } catch (error) {
      this.logger.warn(`Не удалось удалить PM2 процесс: ${error.message}`);
    }

    try {
      const deleteCommand = `rm -rf "${script.pathOnServer}"`;
      await this.sshService.executeCommand(script.serverId, deleteCommand);
    } catch (error) {
      this.logger.warn(`Не удалось удалить директорию: ${error.message}`);
    }

    await this.prisma.script.delete({
      where: { id: script.id },
    });
  }

  async extendScript(scriptId: string, extendScriptDto: ExtendScriptDto, adminId: string) {
    const { days } = extendScriptDto;

    const script = await this.prisma.script.findUnique({
      where: { id: scriptId },
    });

    if (!script) {
      throw new NotFoundException('Скрипт не найден');
    }

    let newExpiry: Date | null = null;

    if (days === null) {
      newExpiry = null;
    } else {
      const currentExpiry = script.expiryDate || new Date();
      newExpiry = new Date(currentExpiry);
      newExpiry.setDate(newExpiry.getDate() + days);
    }

    const updatedScript = await this.prisma.script.update({
      where: { id: scriptId },
      data: {
        expiryDate: newExpiry,
        ownerFrozenOnce: false,
        frozenAt: null,
        frozenUntil: null,
      } as any,
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        server: {
          select: {
            id: true,
            name: true,
            host: true,
          },
        },
      },
    });

    await this.logAction(adminId, 'SCRIPT_EXTEND', scriptId, {
      days,
      previousExpiry: script.expiryDate,
      newExpiry,
    });

    return updatedScript;
  }

  async updateScriptName(scriptId: string, name: string, adminId: string) {
    if (!name || !name.trim()) {
      throw new BadRequestException('Имя скрипта не может быть пустым');
    }

    const script = await this.prisma.script.findUnique({
      where: { id: scriptId },
    });

    if (!script) {
      throw new NotFoundException('Скрипт не найден');
    }

    const updatedScript = await this.prisma.script.update({
      where: { id: scriptId },
      data: { name: name.trim() },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        server: {
          select: {
            id: true,
            name: true,
            host: true,
          },
        },
      },
    });

    await this.logAction(adminId, 'SCRIPT_SETTINGS_UPDATE', scriptId, {
      previousName: script.name,
      newName: name.trim(),
    });

    return updatedScript;
  }

  async updateScriptOwner(scriptId: string, ownerId: string, adminId: string) {
    if (!ownerId || !ownerId.trim()) {
      throw new BadRequestException('ID владельца не может быть пустым');
    }

    const script = await this.prisma.script.findUnique({
      where: { id: scriptId },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });

    if (!script) {
      throw new NotFoundException('Скрипт не найден');
    }

    const newOwner = await this.prisma.user.findUnique({
      where: { id: ownerId },
      select: {
        id: true,
        username: true,
        email: true,
      },
    });

    if (!newOwner) {
      throw new NotFoundException('Пользователь не найден');
    }

    if (script.ownerId === ownerId) {
      return script;
    }

    const updatedScript = await this.prisma.script.update({
      where: { id: scriptId },
      data: { ownerId: ownerId },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        server: {
          select: {
            id: true,
            name: true,
            host: true,
          },
        },
      },
    });

    await this.logAction(adminId, 'SCRIPT_SETTINGS_UPDATE', scriptId, {
      previousOwnerId: script.ownerId,
      previousOwnerUsername: script.owner?.username,
      newOwnerId: ownerId,
      newOwnerUsername: newOwner.username,
    });

    return updatedScript;
  }

  async getServerScriptsStats(serverId: string) {
    const server = await this.prisma.server.findUnique({
      where: { id: serverId },
    });

    if (!server) {
      throw new NotFoundException('Сервер не найден');
    }

    const scripts = await this.prisma.script.findMany({
      where: { serverId },
      select: {
        type: true,
      },
    });

    const stats = {
      total: scripts.length,
      byType: {
        CUSTOM: 0,
        CYBER_LEAGUE: 0,
        WEEKLY_CUP: 0,
        ALLIANCE_BOT: 0,
      },
    };

    scripts.forEach((script) => {
      if (stats.byType[script.type as keyof typeof stats.byType] !== undefined) {
        stats.byType[script.type as keyof typeof stats.byType]++;
      }
    });

    return stats;
  }

  async getAllServers() {
    return this.prisma.server.findMany({
      include: {
        key: {
          select: {
            id: true,
            label: true,
          },
        },
        _count: {
          select: {
            scripts: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createServer(createServerDto: CreateServerDto, adminId: string) {
    const { name, host, port, sshUser, keyId } = createServerDto;

    if (keyId && keyId.trim()) {
      const key = await this.prisma.serverKey.findUnique({
        where: { id: keyId },
      });

      if (!key) {
        throw new BadRequestException('SSH ключ не найден');
      }
    }

    const server = await this.prisma.server.create({
      data: {
        name,
        host,
        port,
        sshUser,
        keyId: keyId && keyId.trim() ? keyId : null,
      },
      include: {
        key: {
          select: {
            id: true,
            label: true,
          },
        },
      },
    });

    await this.logAction(adminId, 'SERVER_ADD', undefined, {
      serverId: server.id,
      name,
      host,
      port,
      sshUser,
    });

    return server;
  }

  async testServerConnection(serverId: string, adminId: string) {
    const server = await this.prisma.server.findUnique({
      where: { id: serverId },
    });

    if (!server) {
      throw new NotFoundException('Сервер не найден');
    }

    try {
      const result = await this.sshService.testSimpleConnection(serverId);

      await this.logAction(adminId, 'SERVER_TEST_CONNECTION', undefined, {
        serverId,
        success: result.success,
        error: result.error,
      });

      return {
        success: result.success,
        message: result.success ? 'Соединение успешно установлено' : `Не удалось установить соединение: ${result.error}`,
        error: result.error,
      };
    } catch (error) {
      await this.logAction(adminId, 'SERVER_TEST_CONNECTION', undefined, {
        serverId,
        success: false,
        error: error.message,
      });

      return {
        success: false,
        message: `Ошибка тестирования: ${error.message}`,
        error: error.message,
      };
    }
  }

  async getAllServerKeys() {
    return this.prisma.serverKey.findMany({
      include: {
        _count: {
          select: {
            servers: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createServerKey(createServerKeyDto: CreateServerKeyDto, adminId: string) {
    const { label, privateKey, publicKey } = createServerKeyDto;

    const encryptedPrivateKey = await this.sshService.encryptPrivateKey(privateKey);

    const serverKey = await this.prisma.serverKey.create({
      data: {
        label,
        privateKeyEncrypted: encryptedPrivateKey,
        publicKey,
      },
    });

    await this.logAction(adminId, 'SERVER_KEY_ADD', undefined, {
      keyId: serverKey.id,
      label,
    });

    return serverKey;
  }

  async getAuditLogs(
    page: number = 1,
    limit: number = 50,
    actionType?: string,
    userId?: string,
  ) {
    const skip = (page - 1) * limit;

    const where: any = {};

    if (actionType) {
      where.actionType = actionType;
    }

    if (userId) {
      where.actorId = userId;
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        include: {
          actor: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
          targetScript: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data: logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getSystemStats() {
    const [
      totalUsers,
      activeUsers,
      blockedUsers,
      totalScripts,
      runningScripts,
      totalServers,
      activeServers,
      totalDeployments,
      recentLogs,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isActive: true, isBlocked: false } }),
      this.prisma.user.count({ where: { isBlocked: true } }),
      this.prisma.script.count(),
      this.prisma.script.count({ where: { status: 'RUNNING' } }),
      this.prisma.server.count(),
      this.prisma.server.count({ where: { isActive: true } }),
      this.prisma.deployment.count(),
      this.prisma.auditLog.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        blocked: blockedUsers,
      },
      scripts: {
        total: totalScripts,
        running: runningScripts,
      },
      servers: {
        total: totalServers,
        active: activeServers,
      },
      deployments: {
        total: totalDeployments,
      },
      activity: {
        recentLogs,
      },
    };
  }

  private async logAction(adminId: string, actionType: string, targetId?: string, details?: any) {
    try {
      const scriptRelatedActions = [
        'SCRIPT_ISSUE',
        'SCRIPT_REVOKE',
        'SCRIPT_EXTEND',
        'SCRIPT_CREATE',
        'SCRIPT_DELETE',
        'SCRIPT_START',
        'SCRIPT_STOP',
        'SCRIPT_RESTART',
        'SCRIPT_DEPLOY'
      ];

      await this.prisma.auditLog.create({
        data: {
          actorId: adminId,
          actionType: actionType as any,
          targetScriptId: scriptRelatedActions.includes(actionType) ? targetId : null,
          details: details || {},
        },
      });
    } catch (error) {
      this.logger.error(`Ошибка логирования действия ${actionType}: ${error.message}`);
    }
  }

  async deleteServer(serverId: string, adminId: string) {
    const server = await this.prisma.server.findUnique({
      where: { id: serverId },
      include: {
        _count: {
          select: {
            scripts: true,
          },
        },
      },
    });

    if (!server) {
      throw new NotFoundException('Сервер не найден');
    }

    if (server._count.scripts > 0) {
      throw new BadRequestException('Нельзя удалить сервер, на котором есть скрипты');
    }

    await this.prisma.server.delete({
      where: { id: serverId },
    });

    await this.logAction(adminId, 'SERVER_DELETE', serverId, {
      serverName: server.name,
      serverHost: server.host,
    });

    return { message: 'Сервер удален успешно' };
  }

  async deleteServerKey(keyId: string, adminId: string) {
    const key = await this.prisma.serverKey.findUnique({
      where: { id: keyId },
      include: {
        _count: {
          select: {
            servers: true,
          },
        },
      },
    });

    if (!key) {
      throw new NotFoundException('SSH ключ не найден');
    }

    if (key._count.servers > 0) {
      throw new BadRequestException('Нельзя удалить SSH ключ, который используется серверами');
    }

    await this.prisma.serverKey.delete({
      where: { id: keyId },
    });

    await this.logAction(adminId, 'SERVER_KEY_DELETE', keyId, {
      keyLabel: key.label,
    });

    return { message: 'SSH ключ удален успешно' };
  }

  async getServerStats() {
    try {
      const servers = await this.prisma.server.findMany({
        where: { isActive: true },
        include: {
          _count: {
            select: {
              scripts: true,
            },
          },
        },
      });

      const serverStats = await Promise.all(
        servers.map(async (server) => {
          try {

            const timeoutPromise = new Promise((_, reject) => {
              setTimeout(() => reject(new Error('Timeout: Server did not respond within 10 seconds')), 3000);
            });


            const stats = await Promise.race([
              this.sshService.getServerStats(server.id),
              timeoutPromise,
            ]) as any;

            const runningScripts = await this.prisma.script.count({
              where: {
                serverId: server.id,
                status: 'RUNNING',
              },
            });

            return {
              id: server.id,
              name: server.name,
              host: server.host,
              status: stats.status || 'online',
              cpuUsage: stats.cpuUsage || 0,
              memoryUsage: stats.memoryUsage || 0,
              diskUsage: stats.diskUsage || 0,
              networkIn: stats.networkIn || 0,
              networkOut: stats.networkOut || 0,
              uptime: stats.uptime || 0,
              loadAverage: stats.loadAverage || [0, 0, 0],
              runningScripts,
              totalScripts: server._count.scripts,
            };
          } catch (error) {
            const errorMsg = error.message || 'No response';
            this.logger.warn(`Server offline: ${server.name} (${server.host}) - ${errorMsg}`, {
              serverId: server.id,
            });

            const runningScripts = await this.prisma.script.count({
              where: {
                serverId: server.id,
                status: 'RUNNING',
              },
            });

            return {
              id: server.id,
              name: server.name,
              host: server.host,
              status: 'offline',
              cpuUsage: 0,
              memoryUsage: 0,
              diskUsage: 0,
              networkIn: 0,
              networkOut: 0,
              uptime: 0,
              loadAverage: [0, 0, 0],
              runningScripts,
              totalScripts: server._count.scripts,
            };
          }
        })
      );

      return {
        servers: serverStats,
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Критическая ошибка получения статистики серверов: ${error.message}`);

      try {
        const servers = await this.prisma.server.findMany({
          where: { isActive: true },
          include: {
            _count: {
              select: {
                scripts: true,
              },
            },
          },
        });

        return {
          servers: servers.map(server => ({
            id: server.id,
            name: server.name,
            host: server.host,
            status: 'offline' as const,
            cpuUsage: 0,
            memoryUsage: 0,
            diskUsage: 0,
            networkIn: 0,
            networkOut: 0,
            uptime: 0,
            loadAverage: [0, 0, 0],
            runningScripts: 0,
            totalScripts: server._count.scripts,
          })),
          lastUpdated: new Date().toISOString(),
        };
      } catch (fallbackError) {
        this.logger.error(`Ошибка fallback получения серверов: ${fallbackError.message}`);
        return {
          servers: [],
          lastUpdated: new Date().toISOString(),
        };
      }
    }
  }

  async updateServer(serverId: string, updateServerDto: UpdateServerDto, adminId: string) {
    try {
      const existingServer = await this.prisma.server.findUnique({
        where: { id: serverId },
      });

      if (!existingServer) {
        throw new NotFoundException('Сервер не найден');
      }

      const updatedServer = await this.prisma.server.update({
        where: { id: serverId },
        data: {
          ...updateServerDto,
          updatedAt: new Date(),
        },
        include: {
          key: {
            select: {
              id: true,
              label: true,
            },
          },
          _count: {
            select: {
              scripts: true,
            },
          },
        },
      });

      await this.logAction(adminId, 'SERVER_UPDATE', serverId, {
        changes: updateServerDto,
        previousData: {
          name: existingServer.name,
          host: existingServer.host,
          port: existingServer.port,
          sshUser: existingServer.sshUser,
          keyId: existingServer.keyId,
        },
      });

      if (process.env.LOG_LEVEL === 'debug') {
        this.logger.debug(`Server updated: ${serverId} by admin ${adminId}`);
      }
      return updatedServer;
    } catch (error) {
      this.logger.error(`Ошибка обновления сервера ${serverId}: ${error.message}`);
      throw error;
    }
  }

  async updateServerKey(keyId: string, updateServerKeyDto: UpdateServerKeyDto, adminId: string) {
    try {
      const existingKey = await this.prisma.serverKey.findUnique({
        where: { id: keyId },
      });

      if (!existingKey) {
        throw new NotFoundException('SSH ключ не найден');
      }

      const updatedKey = await this.prisma.serverKey.update({
        where: { id: keyId },
        data: {
          ...updateServerKeyDto,
          updatedAt: new Date(),
        },
        include: {
          _count: {
            select: {
              servers: true,
            },
          },
        },
      });

      await this.logAction(adminId, 'SERVER_KEY_UPDATE', keyId, {
        changes: updateServerKeyDto,
        previousData: {
          label: existingKey.label,
        },
      });

      if (process.env.LOG_LEVEL === 'debug') {
        this.logger.debug(`SSH key updated: ${keyId} by admin ${adminId}`);
      }
      return updatedKey;
    } catch (error) {
      this.logger.error(`Ошибка обновления SSH ключа ${keyId}: ${error.message}`);
      throw error;
    }
  }

  async getAllNews(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [news, total] = await Promise.all([
      this.prisma.news.findMany({
        skip,
        take: limit,
        orderBy: [
          { createdAt: 'desc' },
        ],
        include: {
          author: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
          _count: {
            select: {
              views: true,
            },
          },
        },
      }),
      this.prisma.news.count(),
    ]);

    return {
      news,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getNewsById(newsId: string) {
    const news = await this.prisma.news.findUnique({
      where: { id: newsId },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        _count: {
          select: {
            views: true,
          },
        },
      },
    });

    if (!news) {
      throw new NotFoundException('Новость не найдена');
    }

    return news;
  }

  async createNews(createNewsDto: any, adminId: string) {
    try {
      const news = await this.newsService.createNews(createNewsDto, adminId);

      await this.logAction(adminId, 'NEWS_CREATE', news.id, {
        title: news.title,
        isPublished: news.isPublished,
      });

      return news;
    } catch (error) {
      this.logger.error(`Ошибка создания новости: ${error.message}`);
      throw error;
    }
  }

  async updateNews(newsId: string, updateNewsDto: any, adminId: string) {
    try {
      const news = await this.newsService.updateNews(newsId, updateNewsDto, adminId);

      await this.logAction(adminId, 'NEWS_UPDATE', newsId, {
        changes: updateNewsDto,
      });

      return news;
    } catch (error) {
      this.logger.error(`Ошибка обновления новости ${newsId}: ${error.message}`);
      throw error;
    }
  }

  async deleteNews(newsId: string, adminId: string) {
    try {
      const news = await this.prisma.news.findUnique({
        where: { id: newsId },
        select: { title: true },
      });

      if (!news) {
        throw new NotFoundException('Новость не найдена');
      }

      await this.newsService.deleteNews(newsId, adminId);

      await this.logAction(adminId, 'NEWS_DELETE', newsId, {
        title: news.title,
      });

      return { message: 'Новость успешно удалена' };
    } catch (error) {
      this.logger.error(`Ошибка удаления новости ${newsId}: ${error.message}`);
      throw error;
    }
  }

  async getScheduledTasks() {
    try {
      const tasks = await this.prisma.scheduledTask.findMany({
        orderBy: { createdAt: 'desc' },
      });
      return tasks;
    } catch (error) {
      this.logger.error(`Ошибка получения задач планировщика: ${error.message}`);
      throw error;
    }
  }

  async getScheduledTask(taskId: string) {
    try {
      const task = await this.prisma.scheduledTask.findUnique({
        where: { id: taskId },
      });

      if (!task) {
        throw new NotFoundException('Задача не найдена');
      }

      return task;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Ошибка получения задачи ${taskId}: ${error.message}`);
      throw error;
    }
  }

  async createScheduledTask(dto: CreateScheduledTaskDto, adminId: string) {
    try {
      const task = await this.prisma.scheduledTask.create({
        data: {
          name: dto.name,
          description: dto.description,
          taskType: dto.taskType as any,
          cronExpression: dto.cronExpression,
          timezone: dto.timezone || 'Europe/Moscow',
          parameters: dto.parameters || {},
          isActive: dto.isActive !== false,
          createdBy: adminId,
        },
      });

      if (task.isActive) {
        await this.schedulerService.scheduleTask(task);
      }

      await this.logAction(adminId, 'SCHEDULED_TASK_CREATE', task.id, {
        taskName: task.name,
        taskType: task.taskType,
      });

      return task;
    } catch (error) {
      this.logger.error(`Ошибка создания задачи планировщика: ${error.message}`);
      throw error;
    }
  }

  async updateScheduledTask(taskId: string, dto: UpdateScheduledTaskDto, adminId: string) {
    try {
      const task = await this.prisma.scheduledTask.findUnique({
        where: { id: taskId },
      });

      if (!task) {
        throw new NotFoundException('Задача не найдена');
      }

      const wasActive = task.isActive;
      const wasCronExpression = task.cronExpression;

      const updatedTask = await this.prisma.scheduledTask.update({
        where: { id: taskId },
        data: {
          name: dto.name,
          description: dto.description,
          taskType: dto.taskType as any,
          cronExpression: dto.cronExpression,
          timezone: dto.timezone,
          parameters: dto.parameters,
          isActive: dto.isActive,
        },
      });

      if (wasActive) {
        await this.schedulerService.unscheduleTask(taskId);
      }

      if (updatedTask.isActive) {
        await this.schedulerService.scheduleTask(updatedTask);
      }

      await this.logAction(adminId, 'SCHEDULED_TASK_UPDATE', taskId, {
        taskName: updatedTask.name,
        changes: {
          wasActive,
          isActive: updatedTask.isActive,
          cronChanged: wasCronExpression !== updatedTask.cronExpression,
        },
      });

      return updatedTask;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Ошибка обновления задачи ${taskId}: ${error.message}`);
      throw error;
    }
  }

  async deleteScheduledTask(taskId: string, adminId: string) {
    try {
      const task = await this.prisma.scheduledTask.findUnique({
        where: { id: taskId },
      });

      if (!task) {
        throw new NotFoundException('Задача не найдена');
      }

      if (task.isActive) {
        await this.schedulerService.unscheduleTask(taskId);
      }

      await this.prisma.scheduledTask.delete({
        where: { id: taskId },
      });

      await this.logAction(adminId, 'SCHEDULED_TASK_DELETE', taskId, {
        taskName: task.name,
      });

      return { message: 'Задача успешно удалена' };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Ошибка удаления задачи ${taskId}: ${error.message}`);
      throw error;
    }
  }

  async runScheduledTask(taskId: string, adminId: string) {
    try {
      const task = await this.prisma.scheduledTask.findUnique({
        where: { id: taskId },
      });

      if (!task) {
        throw new NotFoundException('Задача не найдена');
      }

      await this.schedulerService.executeTask(task);

      await this.logAction(adminId, 'SCHEDULED_TASK_RUN', taskId, {
        taskName: task.name,
        manual: true,
      });

      return { message: 'Задача запущена вручную' };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Ошибка запуска задачи ${taskId}: ${error.message}`);
      throw error;
    }
  }

  async getQueueStats() {
    try {
      return await this.queueService.getQueueStats();
    } catch (error) {
      this.logger.error(`Ошибка получения статистики очередей: ${error.message}`);
      throw new BadRequestException(`Ошибка получения статистики очередей: ${error.message}`);
    }
  }

  async getQueueJobs(queueName: 'deployment' | 'script' | 'expiry', state?: string[], limit?: number) {
    try {
      return await this.queueService.getQueueJobs(queueName, state, limit);
    } catch (error) {
      this.logger.error(`Ошибка получения задач очереди ${queueName}: ${error.message}`);
      throw new BadRequestException(`Ошибка получения задач очереди: ${error.message}`);
    }
  }

  async clearQueue(queueName: 'deployment' | 'script' | 'expiry', adminId: string, states?: string[]) {
    try {
      const result = await this.queueService.clearQueue(queueName, states);

      await this.logAction(adminId, 'QUEUE_CLEAR', null, {
        queue: queueName,
        removed: result.removed,
      });

      return result;
    } catch (error) {
      this.logger.error(`Ошибка очистки очереди ${queueName}: ${error.message}`);
      throw new BadRequestException(`Ошибка очистки очереди: ${error.message}`);
    }
  }

  async clearAllQueues(adminId: string) {
    try {
      const result = await this.queueService.clearAllQueues();

      await this.logAction(adminId, 'QUEUE_CLEAR', null, {
        removed: result.removed,
      });

      return result;
    } catch (error) {
      this.logger.error(`Ошибка очистки очередей: ${error.message}`);
      throw new BadRequestException(`Ошибка очистки очередей: ${error.message}`);
    }
  }
}
