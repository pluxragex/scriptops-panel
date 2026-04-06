import { Controller, Get, Put, Post, Delete, Body, Param, UseGuards, Request, BadRequestException, Query, UnauthorizedException, Ip } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';

import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LinkTelegramDto } from './dto/link-telegram.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Пользователи')
@Controller('users')
@UseGuards(JwtAuthGuard, ThrottlerGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Получение профиля текущего пользователя' })
  @ApiResponse({ status: 200, description: 'Профиль пользователя' })
  async getProfile(@Request() req) {
    return this.usersService.getProfile(req.user.id);
  }

  @Put('me')
  @ApiOperation({ summary: 'Обновление профиля пользователя' })
  @ApiResponse({ status: 200, description: 'Профиль успешно обновлен' })
  @ApiResponse({ status: 409, description: 'Конфликт данных' })
  async updateProfile(@Request() req, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.updateProfile(req.user.id, updateUserDto);
  }

  @Get('me/scripts')
  @ApiOperation({ summary: 'Получение скриптов пользователя' })
  @ApiResponse({ status: 200, description: 'Список скриптов пользователя' })
  async getUserScripts(@Request() req) {
    return this.usersService.getUserScripts(req.user.id);
  }

  @Get('me/stats')
  @ApiOperation({ summary: 'Получение статистики пользователя' })
  @ApiResponse({ status: 200, description: 'Статистика пользователя' })
  async getUserStats(@Request() req) {
    return this.usersService.getUserStats(req.user.id);
  }

  @Put('me/password')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: 'Смена пароля пользователя' })
  @ApiResponse({ status: 200, description: 'Пароль успешно изменен' })
  @ApiResponse({ status: 401, description: 'Неверный текущий пароль' })
  @ApiResponse({ status: 404, description: 'Пользователь не найден' })
  @ApiResponse({ status: 429, description: 'Слишком много попыток' })
  async changePassword(@Request() req, @Body() changePasswordDto: ChangePasswordDto, @Ip() ip: string) {
    const userAgent = req.headers['user-agent'] || undefined;
    const ipAddress = ip || req.ip || undefined;
    return this.usersService.changePassword(req.user.id, changePasswordDto, ipAddress, userAgent);
  }

  @Post('me/telegram/link')
  @ApiOperation({ summary: 'Привязка Telegram аккаунта' })
  @ApiResponse({ status: 200, description: 'Telegram аккаунт успешно привязан' })
  @ApiResponse({ status: 409, description: 'Telegram аккаунт уже привязан к другому пользователю' })
  async linkTelegram(@Request() req, @Body() linkTelegramDto: LinkTelegramDto) {
    const { hash, ...telegramData } = linkTelegramDto;
    return this.usersService.linkTelegram(req.user.id, telegramData, hash);
  }

  @Post('me/telegram/unlink')
  @ApiOperation({ summary: 'Отвязка Telegram аккаунта' })
  @ApiResponse({ status: 200, description: 'Telegram аккаунт успешно отвязан' })
  async unlinkTelegram(@Request() req) {
    return this.usersService.unlinkTelegram(req.user.id);
  }

  @Post('me/two-factor/toggle')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Включение/выключение 2FA через Telegram' })
  @ApiResponse({ status: 200, description: '2FA успешно изменено или требуется подтверждение' })
  @ApiResponse({ status: 400, description: 'Telegram аккаунт не привязан' })
  @ApiResponse({ status: 429, description: 'Слишком много попыток' })
  async toggleTwoFactor(@Request() req, @Body() body: { enabled: boolean }, @Ip() ip: string) {
    const userAgent = req.headers['user-agent'] || undefined;
    const ipAddress = ip || req.ip || undefined;
    return this.usersService.toggleTwoFactor(req.user.id, body.enabled, ipAddress, userAgent);
  }

  @Get('me/pending-action/check')
  @ApiOperation({ summary: 'Проверка статуса pending action' })
  @ApiResponse({ status: 200, description: 'Статус действия' })
  async checkPendingAction(@Request() req, @Query('actionToken') actionToken: string) {
    return this.usersService.checkPendingActionStatus(actionToken);
  }

  @Get('me/sessions')
  @ApiOperation({ summary: 'Получение всех активных сессий пользователя' })
  @ApiResponse({ status: 200, description: 'Список активных сессий' })
  async getUserSessions(@Request() req) {
    return this.usersService.getUserSessions(req.user.id);
  }

  @Delete('me/sessions/:sessionId')
  @ApiOperation({ summary: 'Завершение конкретной сессии' })
  @ApiResponse({ status: 200, description: 'Сессия успешно завершена' })
  @ApiResponse({ status: 404, description: 'Сессия не найдена' })
  async revokeSession(@Request() req, @Param('sessionId') sessionId: string) {
    return this.usersService.revokeSession(req.user.id, sessionId);
  }

  @Post('me/sessions/revoke-all')
  @ApiOperation({ summary: 'Завершение всех сессий кроме текущей' })
  @ApiResponse({ status: 200, description: 'Все остальные сессии успешно завершены' })
  async revokeAllOtherSessions(@Request() req, @Body() body: { refreshToken: string }) {
    if (!body.refreshToken) {
      throw new BadRequestException('Refresh token обязателен');
    }


    const crypto = require('crypto');
    const currentTokenHash = crypto.createHash('sha256').update(body.refreshToken).digest('hex');

    return this.usersService.revokeAllOtherSessions(req.user.id, currentTokenHash);
  }
}
