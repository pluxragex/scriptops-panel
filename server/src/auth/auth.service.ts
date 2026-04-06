import { Injectable, UnauthorizedException, ConflictException, BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

import { PrismaService } from '../common/prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { WebSocketGateway } from '../common/websocket/websocket.gateway';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { TelegramLoginDto } from './dto/telegram-login.dto';
import { TelegramIdLoginDto } from './dto/telegram-id-login.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private webSocketGateway: WebSocketGateway,
  ) {}


  async register(registerDto: RegisterDto) {
    const { email, username, password } = registerDto;


    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { username },
        ],
      },
    });

    if (existingUser) {
      throw new ConflictException('Пользователь с таким email или username уже существует');
    }


    const hashedPassword = await bcrypt.hash(password, 10);


    const user = await this.prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        emailVerified: false,
      },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        createdAt: true,
      },
    });


    const tokens = await this.generateTokens(user.id, user.email);


    const sessionId = await this.createSession(user.id, tokens.refreshToken, undefined, undefined);


    if (sessionId) {
      const payload: JwtPayload = {
        sub: user.id,
        email: user.email,
        iat: Math.floor(Date.now() / 1000),
        jti: uuidv4(),
        sessionId: sessionId,
      };
      tokens.accessToken = await this.jwtService.signAsync(payload);
    }

    return {
      user,
      ...tokens,
      sessionId: sessionId || undefined,
    };
  }


  async login(loginDto: LoginDto, ipAddress?: string, userAgent?: string) {
    const { email, password, twoFactorCode } = loginDto;


    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Неверные учетные данные');
    }


    if (user.isBlocked) {
      throw new UnauthorizedException('Аккаунт заблокирован');
    }


    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Неверные учетные данные');
    }


    if (user.twoFactorEnabled) {
      if (!user.telegramUserId) {
        throw new BadRequestException('Telegram аккаунт не привязан. Невозможно выполнить двухфакторную аутентификацию');
      }


      const pendingLogin = await this.createPendingLogin(user.id, 'email', ipAddress, userAgent);


      await this.sendTwoFactorRequest(user.id, user.telegramUserId, pendingLogin.loginToken, ipAddress, userAgent);

      return {
        requiresTwoFactor: true,
        message: 'Требуется подтверждение входа через Telegram',
        loginToken: pendingLogin.loginToken,
      };
    }


    const tokens = await this.generateTokens(user.id, user.email);


    const sessionId = await this.createSession(user.id, tokens.refreshToken, ipAddress, userAgent);


    if (sessionId) {
      const payload: JwtPayload = {
        sub: user.id,
        email: user.email,
        iat: Math.floor(Date.now() / 1000),
        jti: uuidv4(),
        sessionId: sessionId,
      };
      tokens.accessToken = await this.jwtService.signAsync(payload);
    }


    await this.logUserAction(user.id, 'LOGIN', { method: 'email', ipAddress, userAgent });


    if (user.telegramUserId) {
      await this.sendLoginNotification(user.id, user.telegramUserId, ipAddress, userAgent, sessionId || undefined);
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        createdAt: user.createdAt,
      },
      ...tokens,
      sessionId: sessionId || undefined,
    };
  }


  async refreshToken(refreshToken: string) {

    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    try {


      return await this.prisma.$transaction(async (tx) => {
        const tokenRecord = await tx.refreshToken.findUnique({
          where: { tokenHash },
          include: { user: true },
        });

        if (!tokenRecord || tokenRecord.isRevoked || tokenRecord.expiresAt < new Date()) {
          throw new UnauthorizedException('Недействительный refresh токен');
        }


        if (tokenRecord.user.isBlocked) {
          throw new UnauthorizedException('Аккаунт заблокирован');
        }


        const session = await tx.session.findFirst({
          where: {
            tokenHash: tokenHash,
            userId: tokenRecord.user.id,
            expiresAt: { gt: new Date() },
          },
        });


        if (!session) {

          await tx.refreshToken.update({
            where: { id: tokenRecord.id },
            data: { isRevoked: true },
          });
          throw new UnauthorizedException('Сессия была завершена');
        }


        await tx.refreshToken.update({
          where: { id: tokenRecord.id },
          data: { isRevoked: true },
        });


        const tokens = await this.generateTokens(tokenRecord.user.id, tokenRecord.user.email, tx);


        const newTokenHash = crypto.createHash('sha256').update(tokens.refreshToken).digest('hex');


        const oldSession = await tx.session.findFirst({
          where: {
            userId: tokenRecord.user.id,
            tokenHash: tokenHash,
          },
        });

        let sessionId: string | null = null;
        if (oldSession) {

          await tx.session.update({
            where: { id: oldSession.id },
            data: {
              tokenHash: newTokenHash,
              lastActivityAt: new Date(),
            },
          });
          sessionId = oldSession.id;
        } else {

          const refreshExpiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');
          const expiresAt = this.calculateExpiresAt(refreshExpiresIn);
          const newSession = await tx.session.create({
            data: {
              userId: tokenRecord.user.id,
              tokenHash: newTokenHash,
              expiresAt,
              lastActivityAt: new Date(),
            },
          });
          sessionId = newSession.id;
        }


        if (sessionId) {
          const payload: JwtPayload = {
            sub: tokenRecord.user.id,
            email: tokenRecord.user.email,
            iat: Math.floor(Date.now() / 1000),
            jti: uuidv4(),
            sessionId: sessionId,
          };
          tokens.accessToken = await this.jwtService.signAsync(payload);
        }

        return tokens;
      }, {

        maxWait: 3000,

        timeout: 5000,
        isolationLevel: 'ReadCommitted',
      });
    } catch (error: any) {

      if (error instanceof UnauthorizedException) {
        throw error;
      }

      this.logger.error(`Ошибка при обновлении токена: ${error.message}`, error.stack);


      if (error.code === 'P2002' && error.meta?.target?.includes('tokenHash')) {
        this.logger.warn('Обнаружена коллизия хеша refresh token при обновлении');
        throw new UnauthorizedException('Ошибка обновления токена. Попробуйте войти заново.');
      }

      throw new UnauthorizedException('Ошибка обновления токена');
    }
  }


  async logout(refreshToken: string, userId?: string) {

    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');


    const session = await this.prisma.session.findFirst({
      where: { tokenHash },
    });

    if (!session) {
      this.logger.warn(`Сессия не найдена для tokenHash при logout. userId=${userId || 'не указан'}`);

      await this.prisma.refreshToken.updateMany({
        where: { tokenHash },
        data: { isRevoked: true },
      });
      return { message: 'Успешный выход (сессия не найдена, но токен отозван)' };
    }


    if (userId && session.userId !== userId) {
      this.logger.warn(`Попытка завершить чужую сессию: userId=${userId}, sessionUserId=${session.userId}, sessionId=${session.id}`);
      throw new UnauthorizedException('Сессия не принадлежит пользователю');
    }

    const sessionIdToRevoke = session.id;
    const sessionUserId = session.userId;


    const revokedTokens = await this.prisma.refreshToken.updateMany({
      where: { tokenHash },
      data: { isRevoked: true },
    });


    this.webSocketGateway.emitToSession(sessionIdToRevoke, 'session-revoked', {
      sessionId: sessionIdToRevoke,
      message: 'Ваша сессия была завершена',
    });


    await this.prisma.session.delete({
      where: { id: sessionIdToRevoke },
    });

    const deletedSession = await this.prisma.session.findUnique({
      where: { id: sessionIdToRevoke },
    });
    if (deletedSession) {
      this.logger.error(`ОШИБКА: Сессия ${sessionIdToRevoke} не была удалена из БД!`);
    }


    await this.logUserAction(sessionUserId, 'LOGOUT', {
      sessionId: sessionIdToRevoke,
      method: 'logout',
    });

    this.logger.log(`Сессия ${sessionIdToRevoke} успешно завершена при выходе пользователя ${sessionUserId}`);

    return { message: 'Успешный выход' };
  }


  async logoutAll(userId: string) {

    const sessions = await this.prisma.session.findMany({
      where: {
        userId,
        expiresAt: { gt: new Date() },
      },
    });


    await this.prisma.refreshToken.updateMany({
      where: { userId },
      data: { isRevoked: true },
    });


    const revokedSessionIds: string[] = [];
    for (const session of sessions) {
      this.webSocketGateway.emitToSession(session.id, 'session-revoked', {
        sessionId: session.id,
        message: 'Ваша сессия была завершена',
      });
      revokedSessionIds.push(session.id);
    }


    const deletedCount = await this.prisma.session.deleteMany({
      where: { userId },
    });


    await this.logUserAction(userId, 'LOGOUT', {
      method: 'logout-all',
      revokedSessionsCount: deletedCount.count,
      sessionIds: revokedSessionIds,
    });


    return {
      message: 'Выход со всех устройств выполнен',
      revokedSessionsCount: deletedCount.count,
    };
  }


  async validateUser(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        isActive: true,
        isBlocked: true,
      },
    });

    if (!user || !user.isActive || user.isBlocked) {
      return null;
    }


    if (payload.sessionId) {
      const session = await this.prisma.session.findFirst({
        where: {
          id: payload.sessionId,
          userId: user.id,
          expiresAt: { gt: new Date() },
        },
      });


      if (!session) {
        return null;
      }


      const refreshToken = await this.prisma.refreshToken.findFirst({
        where: {
          tokenHash: session.tokenHash,
          isRevoked: false,
          expiresAt: { gt: new Date() },
        },
      });


      if (!refreshToken) {
        return null;
      }

      return user;
    }


    const activeSession = await this.prisma.session.findFirst({
      where: {
        userId: user.id,
        expiresAt: { gt: new Date() },
      },
    });


    if (!activeSession) {
      return null;
    }


    const activeRefreshToken = await this.prisma.refreshToken.findFirst({
      where: {
        tokenHash: activeSession.tokenHash,
        isRevoked: false,
        expiresAt: { gt: new Date() },
      },
    });


    if (!activeRefreshToken) {
      return null;
    }

    return user;
  }


  async validateUserByCredentials(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return null;
    }


    if (user.isBlocked || !user.isActive) {
      return null;
    }


    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return null;
    }

    return user;
  }


  private calculateExpiresAt(expiresIn: string): Date {
    const expiresAt = new Date();
    const match = expiresIn.match(/^(\d+)([smhd])$/);

    if (!match) {

      expiresAt.setDate(expiresAt.getDate() + 7);
      return expiresAt;
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        expiresAt.setSeconds(expiresAt.getSeconds() + value);
        break;
      case 'm':
        expiresAt.setMinutes(expiresAt.getMinutes() + value);
        break;
      case 'h':
        expiresAt.setHours(expiresAt.getHours() + value);
        break;
      case 'd':
        expiresAt.setDate(expiresAt.getDate() + value);
        break;
      default:
        expiresAt.setDate(expiresAt.getDate() + 7);
    }

    return expiresAt;
  }


  private async generateTokens(userId: string, email: string, prismaClient?: any, sessionId?: string) {
    const prisma = prismaClient || this.prisma;
    const maxRetries = 3;
    let retries = 0;

    while (retries < maxRetries) {
      const payload: JwtPayload = {
        sub: userId,
        email,

        iat: Math.floor(Date.now() / 1000),
        jti: uuidv4(),
        sessionId: sessionId,
      };

      const [accessToken, refreshToken] = await Promise.all([
        this.jwtService.signAsync(payload),
        this.jwtService.signAsync(payload, {
          secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
          expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
        }),
      ]);


      const refreshExpiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');
      const expiresAt = this.calculateExpiresAt(refreshExpiresIn);
      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

      try {

        const existingToken = await prisma.refreshToken.findUnique({
          where: { tokenHash },
        });

        if (existingToken) {

          if (!existingToken.isRevoked && existingToken.expiresAt > new Date()) {
            retries++;
            if (retries >= maxRetries) {
              this.logger.error(`Не удалось создать уникальный refresh token после ${maxRetries} попыток для userId: ${userId}`);
              throw new Error('Не удалось создать уникальный токен');
            }

            await new Promise(resolve => setTimeout(resolve, 10));
            continue;
          } else {

            await prisma.refreshToken.delete({
              where: { id: existingToken.id },
            });
          }
        }

        await prisma.refreshToken.create({
          data: {
            tokenHash,
            userId,
            expiresAt,
          },
        });

        return {
          accessToken,
          refreshToken,
        };
      } catch (error: any) {

        if (error.code === 'P2002' && error.meta?.target?.includes('tokenHash')) {
          retries++;
          if (retries >= maxRetries) {
            this.logger.error(`Не удалось создать уникальный refresh token после ${maxRetries} попыток для userId: ${userId}`);
            throw new Error('Не удалось создать уникальный токен');
          }

          await new Promise(resolve => setTimeout(resolve, 10));
          continue;
        } else {
          throw error;
        }
      }
    }

    throw new Error('Не удалось создать токены');
  }


  private async logUserAction(userId: string, actionType: string, details?: any) {
    await this.prisma.auditLog.create({
      data: {
        actorId: userId,
        actionType: actionType as any,
        details: details || {},
      },
    });
  }


  private verifyTelegramAuth(data: TelegramLoginDto): boolean {
    const botToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
    if (!botToken) {
      throw new BadRequestException('Telegram Bot Token не настроен');
    }


    const { hash, ...userData } = data;


    const dataCheckString = Object.keys(userData)
      .filter(key => userData[key] !== undefined && userData[key] !== null)
      .sort()
      .map(key => `${key}=${userData[key]}`)
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


  async loginWithTelegram(telegramLoginDto: TelegramLoginDto, ipAddress?: string, userAgent?: string) {
    try {

      if (!this.verifyTelegramAuth(telegramLoginDto)) {
        this.logger.warn(`Неудачная попытка Telegram авторизации: неверный хеш для ID ${telegramLoginDto.id}`);
        throw new UnauthorizedException('Неверные данные авторизации Telegram');
      }


      const authDate = new Date(telegramLoginDto.auth_date * 1000);
      const now = new Date();


      if (authDate > now) {
        this.logger.warn(`Неудачная попытка Telegram авторизации: будущая дата для ID ${telegramLoginDto.id}`);
        throw new UnauthorizedException('Неверная дата авторизации');
      }


      const diffMinutes = (now.getTime() - authDate.getTime()) / (1000 * 60);

      if (diffMinutes > 10) {
        this.logger.warn(`Неудачная попытка Telegram авторизации: устаревшие данные для ID ${telegramLoginDto.id} (${Math.round(diffMinutes)} минут назад)`);
        throw new UnauthorizedException('Данные авторизации устарели');
      }


    const user = await this.prisma.user.findUnique({
      where: { telegramUserId: telegramLoginDto.id },
    });

    if (!user) {
      throw new UnauthorizedException('Telegram аккаунт не привязан к учетной записи');
    }


    if (user.isBlocked || !user.isActive) {
      throw new UnauthorizedException('Аккаунт заблокирован или неактивен');
    }


    const tokens = await this.generateTokens(user.id, user.email);


    const sessionId = await this.createSession(user.id, tokens.refreshToken, ipAddress, userAgent);


    if (sessionId) {
      const payload: JwtPayload = {
        sub: user.id,
        email: user.email,
        iat: Math.floor(Date.now() / 1000),
        jti: uuidv4(),
        sessionId: sessionId,
      };
      tokens.accessToken = await this.jwtService.signAsync(payload);
    }


    await this.logUserAction(user.id, 'LOGIN', { method: 'telegram' });

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        createdAt: user.createdAt,
      },
      ...tokens,
      sessionId: sessionId || undefined,
    };
    } catch (error) {

      if (error instanceof UnauthorizedException) {
        this.logger.warn(`Неудачная попытка Telegram авторизации: ${error.message}`, {
          telegramId: telegramLoginDto.id,
          username: telegramLoginDto.username,
        });
      }
      throw error;
    }
  }


  async loginWithTelegramId(telegramIdLoginDto: TelegramIdLoginDto) {

    const botSecret = this.configService.get<string>('TELEGRAM_BOT_SECRET');
    if (botSecret && telegramIdLoginDto.botSecret !== botSecret) {
      throw new UnauthorizedException('Неверный секретный ключ бота');
    }


    const user = await this.prisma.user.findUnique({
      where: { telegramUserId: telegramIdLoginDto.telegramUserId },
    });

    if (!user) {
      throw new UnauthorizedException('Telegram аккаунт не привязан к учетной записи');
    }


    if (user.isBlocked || !user.isActive) {
      throw new UnauthorizedException('Аккаунт заблокирован или неактивен');
    }


    const existingBotSession = await this.prisma.session.findFirst({
      where: {
        userId: user.id,
        isBotSession: true,
        expiresAt: { gt: new Date() },
      },
      orderBy: { lastActivityAt: 'desc' },
    });

    let sessionId: string | null = null;
    let tokens: { accessToken: string; refreshToken: string };

    if (existingBotSession) {


      tokens = await this.generateTokens(user.id, user.email);


      const tokenHash = crypto.createHash('sha256').update(tokens.refreshToken).digest('hex');
      const refreshExpiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN_BOT', '365d');
      const expiresAt = this.calculateExpiresAt(refreshExpiresIn);


      await this.prisma.refreshToken.updateMany({
        where: { tokenHash: existingBotSession.tokenHash },
        data: { isRevoked: true },
      });


      await this.prisma.session.update({
        where: { id: existingBotSession.id },
        data: {
          tokenHash,
          expiresAt,
          lastActivityAt: new Date(),
        },
      });


      const existingRefreshToken = await this.prisma.refreshToken.findUnique({
        where: { tokenHash },
      });

      if (existingRefreshToken) {

        if (!existingRefreshToken.isRevoked && existingRefreshToken.expiresAt > new Date()) {
          await this.prisma.refreshToken.update({
            where: { id: existingRefreshToken.id },
            data: {
              userId: user.id,
              expiresAt,
              isRevoked: false,
            },
          });
        } else {

          await this.prisma.refreshToken.delete({
            where: { id: existingRefreshToken.id },
          });
          await this.prisma.refreshToken.create({
            data: {
              tokenHash,
              userId: user.id,
              expiresAt,
            },
          });
        }
      } else {

        await this.prisma.refreshToken.create({
          data: {
            tokenHash,
            userId: user.id,
            expiresAt,
          },
        });
      }

      sessionId = existingBotSession.id;
    } else {

      tokens = await this.generateTokens(user.id, user.email);
      sessionId = await this.createSession(user.id, tokens.refreshToken, undefined, undefined, true);
    }


    if (sessionId) {
      const payload: JwtPayload = {
        sub: user.id,
        email: user.email,
        iat: Math.floor(Date.now() / 1000),
        jti: uuidv4(),
        sessionId: sessionId,
      };
      tokens.accessToken = await this.jwtService.signAsync(payload);
    }


    await this.logUserAction(user.id, 'LOGIN', { method: 'telegram_id' });

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        createdAt: user.createdAt,
      },
      ...tokens,
      sessionId: sessionId || undefined,
    };
  }


  private async generateAndSendTwoFactorCode(userId: string, telegramUserId: bigint | null): Promise<{ codeId: string; code: string }> {
    if (!telegramUserId) {
      throw new BadRequestException('Telegram аккаунт не привязан');
    }


    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codeId = uuidv4();


    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5);


    await this.prisma.systemSetting.upsert({
      where: { key: `2fa_code_${codeId}` },
      update: {
        value: JSON.stringify({ userId, code, expiresAt }),
        type: 'json',
      },
      create: {
        key: `2fa_code_${codeId}`,
        value: JSON.stringify({ userId, code, expiresAt }),
        type: 'json',
      },
    });


    const botHttpUrl = this.configService.get<string>('TELEGRAM_BOT_HTTP_URL', 'http://localhost:8080');
    const botSecret = this.configService.get<string>('TELEGRAM_BOT_SECRET');

    if (!botSecret) {
      throw new BadRequestException('Telegram Bot Secret не настроен');
    }

    try {
      const response = await fetch(`${botHttpUrl}/bot/2fa/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramUserId: Number(telegramUserId),
          code: code,
          secret: botSecret,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Ошибка отправки кода');
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Не удалось отправить код');
      }
    } catch (error) {
      this.logger.error(`Ошибка отправки 2FA кода через Telegram Bot: ${error}`);
      throw new BadRequestException('Не удалось отправить код через Telegram');
    }

    return { codeId, code };
  }


  private async verifyTwoFactorCode(userId: string, code: string): Promise<boolean> {

    const codes = await this.prisma.systemSetting.findMany({
      where: {
        key: { startsWith: '2fa_code_' },
      },
    });

    for (const codeRecord of codes) {
      try {
        const codeData = JSON.parse(codeRecord.value);
        if (codeData.userId === userId && codeData.code === code) {
          const expiresAt = new Date(codeData.expiresAt);
          if (expiresAt > new Date()) {

            await this.prisma.systemSetting.delete({
              where: { id: codeRecord.id },
            });
            return true;
          } else {

            await this.prisma.systemSetting.delete({
              where: { id: codeRecord.id },
            });
          }
        }
      } catch (error) {

        continue;
      }
    }

    return false;
  }


  private async createPendingLogin(userId: string, method: string, ipAddress?: string, userAgent?: string) {
    const loginToken = uuidv4();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5);


    let deviceInfo = 'Unknown';
    if (userAgent) {
      const ua = userAgent.toLowerCase();
      if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
        deviceInfo = 'Mobile';
      } else if (ua.includes('tablet') || ua.includes('ipad')) {
        deviceInfo = 'Tablet';
      } else {
        deviceInfo = 'Desktop';
      }
    }

    const pendingLogin = await this.prisma.pendingLogin.create({
      data: {
        userId,
        loginToken,
        ipAddress,
        userAgent,
        deviceInfo,
        method,
        expiresAt,
      },
    });

    return pendingLogin;
  }


  private async sendTwoFactorRequest(userId: string, telegramUserId: bigint, loginToken: string, ipAddress?: string, userAgent?: string) {
    const botHttpUrl = this.configService.get<string>('TELEGRAM_BOT_HTTP_URL', 'http://localhost:8080');
    const botSecret = this.configService.get<string>('TELEGRAM_BOT_SECRET');

    if (!botSecret) {
      throw new BadRequestException('Telegram Bot Secret не настроен');
    }

    try {
      const response = await fetch(`${botHttpUrl}/bot/2fa/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramUserId: Number(telegramUserId),
          loginToken,
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
      this.logger.error(`Ошибка отправки 2FA запроса через Telegram Bot: ${error}`);
      throw new BadRequestException('Не удалось отправить запрос через Telegram');
    }
  }


  async checkPendingLoginStatus(loginToken: string) {
    const pendingLogin = await this.prisma.pendingLogin.findUnique({
      where: { loginToken },
      include: { user: true },
    });

    if (!pendingLogin) {
      throw new UnauthorizedException('Неверный токен входа');
    }


    if (pendingLogin.expiresAt < new Date()) {
      await this.prisma.pendingLogin.update({
        where: { id: pendingLogin.id },
        data: { status: 'EXPIRED' },
      });
      throw new UnauthorizedException('Время ожидания подтверждения истекло');
    }


    if (pendingLogin.status === 'APPROVED') {

      const tokens = await this.generateTokens(pendingLogin.userId, pendingLogin.user.email);


      const sessionId = await this.createSession(pendingLogin.userId, tokens.refreshToken, pendingLogin.ipAddress || undefined, pendingLogin.userAgent || undefined);


      if (sessionId) {
        const payload: JwtPayload = {
          sub: pendingLogin.userId,
          email: pendingLogin.user.email,
          iat: Math.floor(Date.now() / 1000),
          jti: uuidv4(),
          sessionId: sessionId,
        };
        tokens.accessToken = await this.jwtService.signAsync(payload);
      }


      await this.logUserAction(pendingLogin.userId, 'LOGIN', {
        method: pendingLogin.method,
        ipAddress: pendingLogin.ipAddress,
        userAgent: pendingLogin.userAgent
      });


      if (pendingLogin.user.telegramUserId) {
        await this.sendLoginNotification(
          pendingLogin.userId,
          pendingLogin.user.telegramUserId,
          pendingLogin.ipAddress || undefined,
          pendingLogin.userAgent || undefined,
          sessionId || undefined
        );
      }


      await this.prisma.pendingLogin.delete({
        where: { id: pendingLogin.id },
      });

      return {
        approved: true,
        user: {
          id: pendingLogin.user.id,
          email: pendingLogin.user.email,
          username: pendingLogin.user.username,
          role: pendingLogin.user.role,
          createdAt: pendingLogin.user.createdAt,
        },
        ...tokens,
        sessionId: sessionId || undefined,
      };
    }

    return {
      approved: false,
      status: pendingLogin.status,
    };
  }


  async approvePendingLogin(loginToken: string) {
    const pendingLogin = await this.prisma.pendingLogin.findUnique({
      where: { loginToken },
    });

    if (!pendingLogin) {
      throw new UnauthorizedException('Неверный токен входа');
    }

    if (pendingLogin.expiresAt < new Date()) {
      await this.prisma.pendingLogin.update({
        where: { id: pendingLogin.id },
        data: { status: 'EXPIRED' },
      });
      throw new UnauthorizedException('Время ожидания подтверждения истекло');
    }

    if (pendingLogin.status !== 'PENDING') {
      throw new BadRequestException(`Вход уже ${pendingLogin.status === 'APPROVED' ? 'подтвержден' : 'отклонен'}`);
    }

    await this.prisma.pendingLogin.update({
      where: { id: pendingLogin.id },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
      },
    });

    return { success: true };
  }


  async rejectPendingLogin(loginToken: string) {
    const pendingLogin = await this.prisma.pendingLogin.findUnique({
      where: { loginToken },
    });

    if (!pendingLogin) {
      throw new UnauthorizedException('Неверный токен входа');
    }

    if (pendingLogin.status !== 'PENDING') {
      throw new BadRequestException(`Вход уже ${pendingLogin.status === 'APPROVED' ? 'подтвержден' : 'отклонен'}`);
    }

    await this.prisma.pendingLogin.update({
      where: { id: pendingLogin.id },
      data: { status: 'REJECTED' },
    });

    return { success: true };
  }


  private async sendLoginNotification(userId: string, telegramUserId: bigint, ipAddress?: string, userAgent?: string, sessionId?: string) {
    const botHttpUrl = this.configService.get<string>('TELEGRAM_BOT_HTTP_URL', 'http://localhost:8080');
    const botSecret = this.configService.get<string>('TELEGRAM_BOT_SECRET');

    if (!botSecret) {
      this.logger.warn('Telegram Bot Secret не настроен, пропускаем отправку уведомления');
      return;
    }

    try {
      const response = await fetch(`${botHttpUrl}/bot/2fa/login-notification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramUserId: Number(telegramUserId),
          ipAddress: ipAddress || 'Unknown',
          userAgent: userAgent || 'Unknown',
          sessionId: sessionId,
          secret: botSecret,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        this.logger.warn(`Ошибка отправки уведомления о входе: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      this.logger.warn(`Ошибка отправки уведомления о входе через Telegram Bot: ${error}`);

    }
  }


  async revokeSessionByTokenHash(userId: string, sessionId?: string, tokenHash?: string) {
    let session;

    if (sessionId) {

      session = await this.prisma.session.findFirst({
        where: {
          id: sessionId,
          userId,
        },
      });


      if (!session) {
        const sessionWithoutUserId = await this.prisma.session.findFirst({
          where: {
            id: sessionId,
          },
        });

        if (sessionWithoutUserId) {
          this.logger.warn(`Сессия ${sessionId} найдена, но принадлежит другому пользователю: ${sessionWithoutUserId.userId} вместо ${userId}`);
          throw new BadRequestException(`Сессия принадлежит другому пользователю`);
        } else {
          this.logger.warn(`Сессия ${sessionId} не найдена в базе данных`);
        }
      }
    } else if (tokenHash) {

      session = await this.prisma.session.findFirst({
        where: {
          userId,
          tokenHash,
        },
      });
    } else {
      throw new BadRequestException('Необходимо указать sessionId или tokenHash');
    }

    if (!session) {
      this.logger.error(`Сессия не найдена: userId=${userId}, sessionId=${sessionId}, tokenHash=${tokenHash}`);
      throw new BadRequestException('Сессия не найдена');
    }


    const isExpired = new Date(session.expiresAt) < new Date();


    const sessionIdToRevoke = session.id;
    const tokenHashToRevoke = session.tokenHash;


    this.webSocketGateway.emitToSession(sessionIdToRevoke, 'session-revoked', {
      sessionId: sessionIdToRevoke,
      message: 'Ваша сессия была завершена',
    });


    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: tokenHashToRevoke },
      data: { isRevoked: true },
    });


    await this.prisma.session.delete({
      where: { id: sessionIdToRevoke },
    });


    return { success: true };
  }


  async approvePendingAction(actionToken: string) {
    const pendingAction = await this.prisma.pendingAction.findUnique({
      where: { actionToken },
      include: { user: true },
    });

    if (!pendingAction) {
      throw new NotFoundException('Действие не найдено');
    }

    if (pendingAction.status !== 'PENDING') {
      throw new BadRequestException('Действие уже обработано');
    }

    if (new Date() > pendingAction.expiresAt) {
      await this.prisma.pendingAction.update({
        where: { id: pendingAction.id },
        data: { status: 'EXPIRED' },
      });
      throw new BadRequestException('Время подтверждения истекло');
    }


    if (pendingAction.actionType === 'DISABLE_2FA') {
      await this.prisma.user.update({
        where: { id: pendingAction.userId },
        data: { twoFactorEnabled: false },
      });
    }

    await this.prisma.pendingAction.update({
      where: { id: pendingAction.id },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
      },
    });

    return { success: true };
  }


  async rejectPendingAction(actionToken: string) {
    const pendingAction = await this.prisma.pendingAction.findUnique({
      where: { actionToken },
    });

    if (!pendingAction) {
      throw new NotFoundException('Действие не найдено');
    }

    if (pendingAction.status !== 'PENDING') {
      throw new BadRequestException('Действие уже обработано');
    }

    await this.prisma.pendingAction.update({
      where: { id: pendingAction.id },
      data: { status: 'REJECTED' },
    });

    return { success: true };
  }


  private async getLocationFromIP(ipAddress?: string): Promise<string | null> {
    if (!ipAddress || ipAddress === 'Unknown' || ipAddress === 'localhost' || ipAddress.startsWith('127.') || ipAddress.startsWith('192.168.') || ipAddress.startsWith('10.') || ipAddress.startsWith('172.')) {
      return null;
    }

    try {

      const response = await fetch(`http://ip-api.com/json/${ipAddress}?fields=status,message,country,regionName,city,lat,lon`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(3000),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.status === 'success') {
          const parts = [];
          if (data.city) parts.push(data.city);
          if (data.regionName) parts.push(data.regionName);
          if (data.country) parts.push(data.country);
          return parts.length > 0 ? parts.join(', ') : null;
        }
      }
    } catch (error) {

    }

    return null;
  }


  private async createSession(userId: string, refreshToken: string, ipAddress?: string, userAgent?: string, isBotSession: boolean = false): Promise<string | null> {
    try {
      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');


      const refreshExpiresIn = isBotSession
        ? this.configService.get<string>('JWT_REFRESH_EXPIRES_IN_BOT', '365d')
        : this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');
      const expiresAt = this.calculateExpiresAt(refreshExpiresIn);


      const location = await this.getLocationFromIP(ipAddress).catch(() => null);


      let deviceInfo = 'Unknown';
      if (userAgent) {
        const ua = userAgent.toLowerCase();


        if (ua.includes('chrome')) {
          if (ua.includes('mobile') || ua.includes('android')) {
            deviceInfo = 'Chrome Mobile';
          } else if (ua.includes('edg')) {
            deviceInfo = 'Edge';
          } else {
            deviceInfo = 'Chrome';
          }
        } else if (ua.includes('firefox')) {
          if (ua.includes('mobile') || ua.includes('android')) {
            deviceInfo = 'Firefox Mobile';
          } else {
            deviceInfo = 'Firefox';
          }
        } else if (ua.includes('safari') && !ua.includes('chrome')) {
          if (ua.includes('iphone') || ua.includes('ipod')) {
            deviceInfo = 'Safari iOS';
          } else if (ua.includes('ipad')) {
            deviceInfo = 'Safari iPad';
          } else {
            deviceInfo = 'Safari';
          }
        } else if (ua.includes('opera') || ua.includes('opr/')) {
          deviceInfo = 'Opera';
        } else if (ua.includes('msie') || ua.includes('trident/')) {
          deviceInfo = 'Internet Explorer';
        } else if (ua.includes('android')) {
          deviceInfo = 'Android';
        } else if (ua.includes('iphone') || ua.includes('ipod')) {
          deviceInfo = 'iPhone';
        } else if (ua.includes('ipad')) {
          deviceInfo = 'iPad';
        } else if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
          deviceInfo = 'Mobile';
        } else if (ua.includes('tablet') || ua.includes('ipad')) {
          deviceInfo = 'Tablet';
        } else {
          deviceInfo = 'Desktop';
        }
      }


      const existingSession = await this.prisma.session.findUnique({
        where: { tokenHash },
      });

      if (existingSession) {

        const actualIsBotSession = existingSession.isBotSession;


        const actualRefreshExpiresIn = actualIsBotSession
          ? this.configService.get<string>('JWT_REFRESH_EXPIRES_IN_BOT', '365d')
          : this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');
        const actualExpiresAt = this.calculateExpiresAt(actualRefreshExpiresIn);


        await this.prisma.session.update({
          where: { tokenHash },
          data: {
            lastActivityAt: new Date(),
            ipAddress: ipAddress || existingSession.ipAddress,
            userAgent: userAgent || existingSession.userAgent,
            deviceInfo,
            location: location || existingSession.location,
            expiresAt: actualExpiresAt,
          },
        });
        return existingSession.id;
      } else {

        const newSession = await this.prisma.session.create({
          data: {
            userId,
            tokenHash,
            ipAddress,
            userAgent,
            deviceInfo: isBotSession ? 'Telegram Bot' : deviceInfo,
            location,
            expiresAt,
            isBotSession,
          },
        });
        return newSession.id;
      }
    } catch (error: any) {

      this.logger.error(`Ошибка создания сессии для пользователя ${userId}: ${error.message}`);

      return null;
    }
  }
}