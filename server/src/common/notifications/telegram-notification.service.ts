import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TelegramNotificationService {
  private readonly logger = new Logger(TelegramNotificationService.name);
  private readonly botHttpUrl: string;
  private readonly botSecret: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.botHttpUrl = this.configService.get<string>('TELEGRAM_BOT_HTTP_URL', 'http://localhost:8080');
    this.botSecret = this.configService.get<string>('TELEGRAM_BOT_SECRET');
  }


  async sendPasswordChangedNotification(
    userId: string,
    ipAddress?: string,
    userAgent?: string,
    changedByAdmin: boolean = false,
  ) {
    if (!this.botSecret) {
      this.logger.warn('Telegram Bot Secret не настроен, пропускаем отправку уведомления');
      return;
    }

    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { telegramUserId: true },
      });

      if (!user?.telegramUserId) {
        return;
      }

      const response = await fetch(`${this.botHttpUrl}/bot/notifications/password-changed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramUserId: Number(user.telegramUserId),
          ipAddress: ipAddress || 'Unknown',
          userAgent: userAgent || 'Unknown',
          changedByAdmin,
          secret: this.botSecret,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        this.logger.warn(`Ошибка отправки уведомления об изменении пароля: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      this.logger.warn(`Ошибка отправки уведомления об изменении пароля через Telegram Bot: ${error}`);
    }
  }


  async sendScriptExpiringNotification(
    userId: string,
    scriptName: string,
    scriptId: string,
    daysLeft: number,
  ) {
    if (!this.botSecret) {
      this.logger.warn('Telegram Bot Secret не настроен, пропускаем отправку уведомления');
      return;
    }

    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { telegramUserId: true },
      });

      if (!user?.telegramUserId) {
        return;
      }

      const response = await fetch(`${this.botHttpUrl}/bot/notifications/script-expiring`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramUserId: Number(user.telegramUserId),
          scriptName,
          scriptId,
          daysLeft,
          secret: this.botSecret,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        this.logger.warn(`Ошибка отправки уведомления о скором истечении скрипта: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      this.logger.warn(`Ошибка отправки уведомления о скором истечении скрипта через Telegram Bot: ${error}`);
    }
  }


  async sendScriptExpiredNotification(
    userId: string,
    scriptName: string,
    scriptId: string,
  ) {
    if (!this.botSecret) {
      this.logger.warn('Telegram Bot Secret не настроен, пропускаем отправку уведомления');
      return;
    }

    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { telegramUserId: true },
      });

      if (!user?.telegramUserId) {
        return;
      }

      const response = await fetch(`${this.botHttpUrl}/bot/notifications/script-expired`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramUserId: Number(user.telegramUserId),
          scriptName,
          scriptId,
          secret: this.botSecret,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        this.logger.warn(`Ошибка отправки уведомления об истечении скрипта: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      this.logger.warn(`Ошибка отправки уведомления об истечении скрипта через Telegram Bot: ${error}`);
    }
  }


  async sendScriptAccessGrantedNotification(
    userId: string,
    scriptName: string,
    scriptId: string,
    ownerUsername: string,
    permissions: {
      canView?: boolean;
      canStart?: boolean;
      canStop?: boolean;
      canRestart?: boolean;
      canViewLogs?: boolean;
      canManageSettings?: boolean;
    },
  ) {
    if (!this.botSecret) {
      this.logger.warn('Telegram Bot Secret не настроен, пропускаем отправку уведомления');
      return;
    }

    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { telegramUserId: true },
      });

      if (!user?.telegramUserId) {
        return;
      }

      const response = await fetch(`${this.botHttpUrl}/bot/notifications/script-access-granted`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramUserId: Number(user.telegramUserId),
          scriptName,
          scriptId,
          ownerUsername,
          permissions,
          secret: this.botSecret,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        this.logger.warn(`Ошибка отправки уведомления о предоставлении доступа: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      this.logger.warn(`Ошибка отправки уведомления о предоставлении доступа через Telegram Bot: ${error}`);
    }
  }


  async sendScriptAccessRevokedNotification(
    userId: string,
    scriptName: string,
    scriptId: string,
    ownerUsername: string,
  ) {
    if (!this.botSecret) {
      this.logger.warn('Telegram Bot Secret не настроен, пропускаем отправку уведомления');
      return;
    }

    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { telegramUserId: true },
      });

      if (!user?.telegramUserId) {
        return;
      }

      const response = await fetch(`${this.botHttpUrl}/bot/notifications/script-access-revoked`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramUserId: Number(user.telegramUserId),
          scriptName,
          scriptId,
          ownerUsername,
          secret: this.botSecret,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        this.logger.warn(`Ошибка отправки уведомления об отзыве доступа: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      this.logger.warn(`Ошибка отправки уведомления об отзыве доступа через Telegram Bot: ${error}`);
    }
  }


  async sendNewsNotification(
    newsTitle: string,
    newsId: string,
    newsSlug: string,
  ) {
    if (!this.botSecret) {
      this.logger.warn('Telegram Bot Secret не настроен, пропускаем отправку уведомления');
      return;
    }

    try {

      const users = await this.prisma.user.findMany({
        where: {
          telegramUserId: { not: null },
        },
        select: {
          telegramUserId: true,
        },
      });


      const promises = users.map((user) =>
        fetch(`${this.botHttpUrl}/bot/notifications/news`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            telegramUserId: Number(user.telegramUserId),
            newsTitle,
            newsId,
            newsSlug,
            secret: this.botSecret,
          }),
        }).catch((error) => {
          this.logger.warn(`Ошибка отправки уведомления о новости пользователю ${user.telegramUserId}: ${error}`);
          return null;
        }),
      );

      await Promise.all(promises);
      this.logger.log(`Уведомления о новой новости отправлены ${users.length} пользователям`);
    } catch (error) {
      this.logger.warn(`Ошибка отправки уведомлений о новой новости через Telegram Bot: ${error}`);
    }
  }


  async sendScriptUpdatedNotification(
    userId: string,
    scriptName: string,
    scriptId: string,
    templateName: string,
  ) {
    if (!this.botSecret) {
      this.logger.warn('Telegram Bot Secret не настроен, пропускаем отправку уведомления');
      return;
    }

    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { telegramUserId: true },
      });

      if (!user?.telegramUserId) {
        return;
      }

      const response = await fetch(`${this.botHttpUrl}/bot/notifications/script-updated`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramUserId: Number(user.telegramUserId),
          scriptName,
          scriptId,
          templateName,
          secret: this.botSecret,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        this.logger.warn(`Ошибка отправки уведомления об обновлении скрипта: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      this.logger.warn(`Ошибка отправки уведомления об обновлении скрипта через Telegram Bot: ${error}`);
    }
  }


  async sendServerIssueNotification(
    serverName: string,
    serverId: string,
    issueDescription: string = 'Проблемы с подключением',
  ) {
    if (!this.botSecret) {
      this.logger.warn('Telegram Bot Secret не настроен, пропускаем отправку уведомления');
      return;
    }

    try {

      const admins = await this.prisma.user.findMany({
        where: {
          role: { in: ['ADMIN', 'SUPER_ADMIN'] },
          telegramUserId: { not: null },
        },
        select: {
          telegramUserId: true,
        },
      });


      const promises = admins.map((admin) =>
        fetch(`${this.botHttpUrl}/bot/notifications/server-issue`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            telegramUserId: Number(admin.telegramUserId),
            serverName,
            serverId,
            issueDescription,
            secret: this.botSecret,
          }),
        }).catch((error) => {
          this.logger.warn(`Ошибка отправки уведомления о проблемах с сервером админу ${admin.telegramUserId}: ${error}`);
          return null;
        }),
      );

      await Promise.all(promises);
      this.logger.log(`Уведомления о проблемах с сервером отправлены ${admins.length} администраторам`);
    } catch (error) {
      this.logger.warn(`Ошибка отправки уведомлений о проблемах с сервером через Telegram Bot: ${error}`);
    }
  }


  async sendServerRecoveredNotification(
    serverName: string,
    serverId: string,
  ) {
    if (!this.botSecret) {
      this.logger.warn('Telegram Bot Secret не настроен, пропускаем отправку уведомления');
      return;
    }

    try {

      const admins = await this.prisma.user.findMany({
        where: {
          role: { in: ['ADMIN', 'SUPER_ADMIN'] },
          telegramUserId: { not: null },
        },
        select: {
          telegramUserId: true,
        },
      });


      const promises = admins.map((admin) =>
        fetch(`${this.botHttpUrl}/bot/notifications/server-recovered`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            telegramUserId: Number(admin.telegramUserId),
            serverName,
            serverId,
            secret: this.botSecret,
          }),
        }).catch((error) => {
          this.logger.warn(`Ошибка отправки уведомления о восстановлении сервера админу ${admin.telegramUserId}: ${error}`);
          return null;
        }),
      );

      await Promise.all(promises);
      this.logger.log(`Уведомления о восстановлении сервера отправлены ${admins.length} администраторам`);
    } catch (error) {
      this.logger.warn(`Ошибка отправки уведомлений о восстановлении сервера через Telegram Bot: ${error}`);
    }
  }
}

