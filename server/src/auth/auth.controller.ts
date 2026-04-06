import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards, Request, Ip, UnauthorizedException, Get, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';

import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { LogoutDto } from './dto/logout.dto';
import { TelegramLoginDto } from './dto/telegram-login.dto';
import { TelegramIdLoginDto } from './dto/telegram-id-login.dto';
import { CheckPendingLoginDto } from './dto/check-pending-login.dto';
import { ApprovePendingLoginDto } from './dto/approve-pending-login.dto';
import { RevokeSessionDto } from './dto/revoke-session.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from './decorators/public.decorator';

@ApiTags('Аутентификация')
@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Get('csrf-token')
  @Public()
  @ApiOperation({ summary: 'Получение CSRF токена' })
  @ApiResponse({ status: 200, description: 'CSRF токен получен' })
  getCsrfToken(@Request() req, @Res() res: Response) {
    const csrfToken = req.cookies?.['csrf-token'] || req.headers['x-csrf-token'];
    return res.json({ csrfToken });
  }

  @Post('register')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Регистрация нового пользователя' })
  @ApiResponse({ status: 201, description: 'Пользователь успешно зарегистрирован' })
  @ApiResponse({ status: 409, description: 'Пользователь уже существует' })
  @ApiResponse({ status: 429, description: 'Слишком много попыток регистрации' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Вход пользователя' })
  @ApiResponse({ status: 200, description: 'Успешный вход' })
  @ApiResponse({ status: 401, description: 'Неверные учетные данные' })
  @ApiResponse({ status: 429, description: 'Слишком много попыток входа' })
  async login(@Body() loginDto: LoginDto, @Request() req, @Ip() ip: string) {
    const ipAddress = ip || req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.authService.login(loginDto, ipAddress, userAgent);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Обновление access токена' })
  @ApiResponse({ status: 200, description: 'Токен успешно обновлен' })
  @ApiResponse({ status: 401, description: 'Недействительный refresh токен' })
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshTokenDto.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Выход пользователя' })
  @ApiResponse({ status: 200, description: 'Успешный выход' })
  async logout(@Body() logoutDto: LogoutDto, @Request() req) {

    return this.authService.logout(logoutDto.refreshToken, req.user?.id);
  }

  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Выход со всех устройств' })
  @ApiResponse({ status: 200, description: 'Выход со всех устройств выполнен' })
  async logoutAll(@Request() req) {
    return this.authService.logoutAll(req.user.id);
  }

  @Post('telegram')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Авторизация через Telegram' })
  @ApiResponse({ status: 200, description: 'Успешная авторизация через Telegram' })
  @ApiResponse({ status: 401, description: 'Неверные данные авторизации Telegram' })
  @ApiResponse({ status: 429, description: 'Слишком много запросов' })
  async loginWithTelegram(@Body() telegramLoginDto: TelegramLoginDto, @Request() req, @Ip() ip: string) {
    const ipAddress = ip || req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.authService.loginWithTelegram(telegramLoginDto, ipAddress, userAgent);
  }

  @Post('telegram/bot')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Авторизация через Telegram ID (для бота)' })
  @ApiResponse({ status: 200, description: 'Успешная авторизация через Telegram ID' })
  @ApiResponse({ status: 401, description: 'Telegram аккаунт не привязан или неверный секретный ключ' })
  async loginWithTelegramId(@Body() telegramIdLoginDto: TelegramIdLoginDto) {
    return this.authService.loginWithTelegramId(telegramIdLoginDto);
  }

  @Post('check-pending-login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Проверка статуса ожидающего подтверждения входа' })
  @ApiResponse({ status: 200, description: 'Статус проверен' })
  @ApiResponse({ status: 401, description: 'Неверный токен или время истекло' })
  async checkPendingLogin(@Body() checkPendingLoginDto: CheckPendingLoginDto) {
    return this.authService.checkPendingLoginStatus(checkPendingLoginDto.loginToken);
  }

  @Post('approve-pending-login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Подтверждение входа через Telegram (для бота)' })
  @ApiResponse({ status: 200, description: 'Вход подтвержден' })
  @ApiResponse({ status: 401, description: 'Неверный токен или секретный ключ' })
  async approvePendingLogin(@Body() approvePendingLoginDto: ApprovePendingLoginDto) {

    const botSecret = this.configService.get<string>('TELEGRAM_BOT_SECRET');
    if (!botSecret || approvePendingLoginDto.secret !== botSecret) {
      throw new UnauthorizedException('Неверный секретный ключ');
    }
    return this.authService.approvePendingLogin(approvePendingLoginDto.loginToken);
  }

  @Post('reject-pending-login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Отклонение входа через Telegram (для бота)' })
  @ApiResponse({ status: 200, description: 'Вход отклонен' })
  @ApiResponse({ status: 401, description: 'Неверный токен или секретный ключ' })
  async rejectPendingLogin(@Body() approvePendingLoginDto: ApprovePendingLoginDto) {

    const botSecret = this.configService.get<string>('TELEGRAM_BOT_SECRET');
    if (!botSecret || approvePendingLoginDto.secret !== botSecret) {
      throw new UnauthorizedException('Неверный секретный ключ');
    }
    return this.authService.rejectPendingLogin(approvePendingLoginDto.loginToken);
  }

  @Post('approve-pending-action')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Подтверждение действия через Telegram (для бота)' })
  @ApiResponse({ status: 200, description: 'Действие подтверждено' })
  @ApiResponse({ status: 401, description: 'Неверный секретный ключ' })
  async approvePendingAction(@Body() body: { actionToken: string, secret?: string }) {

    const botSecret = this.configService.get<string>('TELEGRAM_BOT_SECRET');
    if (!botSecret) {
      throw new UnauthorizedException('Telegram Bot Secret не настроен');
    }
    if (!body.secret || body.secret !== botSecret) {
      throw new UnauthorizedException('Неверный секретный ключ');
    }
    return this.authService.approvePendingAction(body.actionToken);
  }

  @Post('reject-pending-action')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Отклонение действия через Telegram (для бота)' })
  @ApiResponse({ status: 200, description: 'Действие отклонено' })
  @ApiResponse({ status: 401, description: 'Неверный секретный ключ' })
  async rejectPendingAction(@Body() body: { actionToken: string, secret?: string }) {

    const botSecret = this.configService.get<string>('TELEGRAM_BOT_SECRET');
    if (!botSecret) {
      throw new UnauthorizedException('Telegram Bot Secret не настроен');
    }
    if (!body.secret || body.secret !== botSecret) {
      throw new UnauthorizedException('Неверный секретный ключ');
    }
    return this.authService.rejectPendingAction(body.actionToken);
  }

  @Post('revoke-session')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Завершение сессии из Telegram (для бота)' })
  @ApiResponse({ status: 200, description: 'Сессия завершена' })
  @ApiResponse({ status: 401, description: 'Неверный секретный ключ' })
  async revokeSession(@Body() revokeSessionDto: RevokeSessionDto) {

    const botSecret = this.configService.get<string>('TELEGRAM_BOT_SECRET');
    if (!botSecret || revokeSessionDto.secret !== botSecret) {
      throw new UnauthorizedException('Неверный секретный ключ');
    }
    return this.authService.revokeSessionByTokenHash(
      revokeSessionDto.userId,
      revokeSessionDto.sessionId,
      revokeSessionDto.tokenHash
    );
  }
}
