import { Injectable, NotFoundException, ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { WebSocketGateway } from '../common/websocket/websocket.gateway';
import { TelegramNotificationService } from '../common/notifications/telegram-notification.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private webSocketGateway: WebSocketGateway,
    private telegramNotificationService: TelegramNotificationService,
  ) {}


  async getProfile(userId: string) {
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
        telegramUserId: true,
        twoFactorEnabled: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            scripts: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    return user;
  }


  async updateProfile(userId: string, updateUserDto: UpdateUserDto) {
    const { username, email } = updateUserDto;


    if (username || email) {
      const existingUser = await this.prisma.user.findFirst({
        where: {
          AND: [
            { id: { not: userId } },
            {
              OR: [
                ...(username ? [{ username }] : []),
                ...(email ? [{ email }] : []),
              ],
            },
          ],
        },
      });

      if (existingUser) {
        throw new ConflictException('Пользователь с таким username или email уже существует');
      }
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(username && { username }),
        ...(email && { email, emailVerified: false }),
      },
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
      },
    });

    return updatedUser;
  }


  async getUserScripts(userId: string) {
    const scripts = await this.prisma.script.findMany({
      where: { ownerId: userId },
      include: {
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
      orderBy: { createdAt: 'desc' },
    });

    return scripts;
  }


  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }


  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }


  async validateUserByCredentials(email: string, password: string): Promise<User | null> {
    const user = await this.findByEmail(email);
    if (!user) {
      return null;
    }


    if (user.isBlocked || !user.isActive) {
      return null;
    }


    return user;
  }


  async getUserStats(userId: string) {
    const [scriptsCount, runningScriptsCount, totalDeployments] = await Promise.all([
      this.prisma.script.count({
        where: { ownerId: userId },
      }),
      this.prisma.script.count({
        where: {
          ownerId: userId,
          status: 'RUNNING',
        },
      }),
      this.prisma.deployment.count({
        where: {
          script: {
            ownerId: userId,
          },
        },
      }),
    ]);

    return {
      totalScripts: scriptsCount,
      runningScripts: runningScriptsCount,
      totalDeployments,
    };
  }


  async changePassword(userId: string, changePasswordDto: ChangePasswordDto, ipAddress?: string, userAgent?: string) {
    const { currentPassword, newPassword } = changePasswordDto;


    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        password: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }


    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Неверный текущий пароль');
    }


    const hashedNewPassword = await bcrypt.hash(newPassword, 10);


    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword },
    });


    await this.telegramNotificationService.sendPasswordChangedNotification(
      userId,
      ipAddress,
      userAgent,
      false,
    );

    return { message: 'Пароль успешно изменен' };
  }


  private verifyTelegramHash(data: { id: number; first_name: string; last_name?: string; username?: string; photo_url?: string; auth_date: number }, hash: string): boolean {
    const botToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
    if (!botToken) {
      throw new BadRequestException('Telegram Bot Token не настроен');
    }


    const dataCheckString = Object.keys(data)
      .filter(key => data[key] !== undefined && data[key] !== null)
      .sort()
      .map(key => `${key}=${data[key]}`)
      .join('\n');


    const secretKey = crypto
      .createHash('sha256')
      .update(botToken)
      .digest();


    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');


    return calculatedHash === hash;
  }


  async linkTelegram(
    userId: string,
    telegramData: { id: number; first_name: string; last_name?: string; username?: string; photo_url?: string; auth_date: number },
    hash: string,
  ) {

    if (!this.verifyTelegramHash(telegramData, hash)) {
      throw new UnauthorizedException('Неверные данные авторизации Telegram');
    }


    const authDate = new Date(telegramData.auth_date * 1000);
    const now = new Date();


    if (authDate > now) {
      throw new UnauthorizedException('Неверная дата авторизации');
    }


    const diffMinutes = (now.getTime() - authDate.getTime()) / (1000 * 60);

    if (diffMinutes > 10) {
      throw new UnauthorizedException('Данные авторизации устарели');
    }


    const existingUser = await this.prisma.user.findUnique({
      where: { telegramUserId: telegramData.id },
    });

    if (existingUser && existingUser.id !== userId) {
      throw new ConflictException('Этот Telegram аккаунт уже привязан к другому пользователю');
    }


    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { telegramUserId: telegramData.id },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        telegramUserId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return updatedUser;
  }


  async unlinkTelegram(userId: string) {
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        telegramUserId: null,
        twoFactorEnabled: false,
      },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        telegramUserId: true,
        twoFactorEnabled: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return updatedUser;
  }


  async findByTelegramId(telegramUserId: number) {
    return this.prisma.user.findUnique({
      where: { telegramUserId },
    });
  }


  async toggleTwoFactor(userId: string, enabled: boolean, ipAddress?: string, userAgent?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { telegramUserId: true, twoFactorEnabled: true },
    });

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    if (enabled && !user.telegramUserId) {
      throw new BadRequestException('Для включения 2FA необходимо привязать Telegram аккаунт');
    }


    if (!enabled && user.twoFactorEnabled && user.telegramUserId) {

      const actionToken = this.generateActionToken();
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 5);

      const pendingAction = await this.prisma.pendingAction.create({
        data: {
          userId,
          actionToken,
          actionType: 'DISABLE_2FA',
          ipAddress: ipAddress || null,
          userAgent: userAgent || null,
          expiresAt,
        },
      });


      await this.sendTwoFactorActionRequest(userId, user.telegramUserId, actionToken, 'DISABLE_2FA', ipAddress, userAgent);

      return {
        requiresConfirmation: true,
        message: 'Требуется подтверждение выключения 2FA через Telegram',
        actionToken: pendingAction.actionToken,
      };
    }


    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: enabled },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        twoFactorEnabled: true,
        telegramUserId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return updatedUser;
  }


  private generateActionToken(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }


  private async sendTwoFactorActionRequest(
    userId: string,
    telegramUserId: bigint,
    actionToken: string,
    actionType: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    const botHttpUrl = this.configService.get<string>('TELEGRAM_BOT_HTTP_URL', 'http://localhost:8080');
    const botSecret = this.configService.get<string>('TELEGRAM_BOT_SECRET');

    if (!botSecret) {
      throw new BadRequestException('Telegram Bot Secret не настроен');
    }

    try {
      const response = await fetch(`${botHttpUrl}/bot/2fa/action-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramUserId: Number(telegramUserId),
          actionToken,
          actionType,
          ipAddress: ipAddress || 'Unknown',
          userAgent: userAgent || 'Unknown',
          secret: botSecret,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Ошибка отправки запроса');
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Не удалось отправить запрос');
      }
    } catch (error) {
      throw new BadRequestException('Не удалось отправить запрос через Telegram');
    }
  }


  async checkPendingActionStatus(actionToken: string) {
    const pendingAction = await this.prisma.pendingAction.findUnique({
      where: { actionToken },
      include: { user: true },
    });

    if (!pendingAction) {
      throw new NotFoundException('Действие не найдено');
    }


    if (new Date() > pendingAction.expiresAt) {
      await this.prisma.pendingAction.update({
        where: { id: pendingAction.id },
        data: { status: 'EXPIRED' },
      });
      return { approved: false, status: 'EXPIRED' };
    }

    if (pendingAction.status === 'APPROVED') {

      await this.prisma.pendingAction.delete({
        where: { id: pendingAction.id },
      });


      const updatedUser = await this.prisma.user.findUnique({
        where: { id: pendingAction.userId },
        select: {
          id: true,
          email: true,
          username: true,
          role: true,
          twoFactorEnabled: true,
          telegramUserId: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return {
        approved: true,
        user: updatedUser,
      };
    }

    return {
      approved: false,
      status: pendingAction.status,
    };
  }


  async getUserSessions(userId: string) {

    const sessions = await this.prisma.session.findMany({
      where: {
        userId,
        isBotSession: false,
      },
      orderBy: [
        { lastActivityAt: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return sessions;
  }


  async revokeSession(userId: string, sessionId: string) {
    const session = await this.prisma.session.findFirst({
      where: {
        id: sessionId,
        userId,
      },
    });

    if (!session) {
      throw new NotFoundException('Сессия не найдена');
    }


    if (session.isBotSession) {
      throw new BadRequestException('Сессия телеграм бота не может быть завершена через веб-интерфейс');
    }


    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: session.tokenHash },
      data: { isRevoked: true },
    });


    await this.prisma.session.delete({
      where: { id: sessionId },
    });


    this.webSocketGateway.emitToSession(sessionId, 'session-revoked', {
      sessionId,
      message: 'Ваша сессия была завершена',
    });

    return { message: 'Сессия успешно завершена' };
  }


  async revokeAllOtherSessions(userId: string, currentTokenHash: string) {

    const sessionsToRevoke = await this.prisma.session.findMany({
      where: {
        userId,
        tokenHash: { not: currentTokenHash },
        isBotSession: false,
      },
    });


    const tokenHashes = sessionsToRevoke.map(s => s.tokenHash);
    if (tokenHashes.length > 0) {
      await this.prisma.refreshToken.updateMany({
        where: {
          tokenHash: { in: tokenHashes },
        },
        data: { isRevoked: true },
      });
    }


    await this.prisma.session.deleteMany({
      where: {
        userId,
        tokenHash: { not: currentTokenHash },
        isBotSession: false,
      },
    });


    this.webSocketGateway.emitToUser(userId, 'sessions-revoked', {
      message: 'Все остальные сессии были завершены',
      revokedCount: sessionsToRevoke.length,
    });

    return { message: 'Все остальные сессии успешно завершены' };
  }
}
