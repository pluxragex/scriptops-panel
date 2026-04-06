import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';

import { ScriptsService } from './scripts.service';
import { CreateScriptDto } from './dto/create-script.dto';
import { DeployScriptDto } from './dto/deploy-script.dto';
import { UpdateScriptSettingsDto } from './dto/update-script-settings.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';
import { CsrfGuard } from '../common/guards/csrf.guard';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Скрипты')
@Controller('scripts')
@UseGuards(JwtAuthGuard, ThrottlerGuard)
@ApiBearerAuth()
export class ScriptsController {
  constructor(private readonly scriptsService: ScriptsService) {}

  @Get()
  @ApiOperation({ summary: 'Получение списка скриптов пользователя' })
  @ApiResponse({ status: 200, description: 'Список скриптов' })
  async getUserScripts(@Request() req) {
    return this.scriptsService.getUserScripts(req.user.id);
  }

  @Get('search-users')
  @ApiOperation({ summary: 'Поиск пользователей для выдачи доступа' })
  @ApiResponse({ status: 200, description: 'Список пользователей' })
  async searchUsers(@Query('q') query: string, @Request() req) {
    return this.scriptsService.searchUsers(query, req.user.id);
  }

  @Get(':id/access')
  @ApiOperation({ summary: 'Получение прав доступа пользователя к скрипту' })
  @ApiResponse({ status: 200, description: 'Права доступа к скрипту' })
  @ApiResponse({ status: 404, description: 'Скрипт не найден' })
  @ApiResponse({ status: 403, description: 'Нет доступа к скрипту' })
  async getUserScriptAccess(@Param('id') id: string, @Request() req) {
    return this.scriptsService.getUserScriptAccess(id, req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получение скрипта по ID' })
  @ApiResponse({ status: 200, description: 'Данные скрипта' })
  @ApiResponse({ status: 404, description: 'Скрипт не найден' })
  async getScriptById(@Param('id') id: string, @Request() req) {
    return this.scriptsService.getScriptById(id, req.user.id);
  }

  @Post()
  @UseGuards(CsrfGuard)
  @ApiOperation({ summary: 'Создание нового скрипта' })
  @ApiResponse({ status: 201, description: 'Скрипт создан' })
  async createScript(@Body() createScriptDto: CreateScriptDto, @Request() req) {

    return await this.scriptsService.createScript(req.user.id, createScriptDto);
  }

  @Post(':id/deploy')
  @UseGuards(CsrfGuard)
  @ApiOperation({ summary: 'Деплой скрипта' })
  @ApiResponse({ status: 200, description: 'Деплой инициирован' })
  async deployScript(
    @Param('id') id: string,
    @Body() deployScriptDto: DeployScriptDto,
    @Request() req,
  ) {
    return this.scriptsService.deployScript(id, req.user.id, deployScriptDto);
  }

  @Post(':id/start')
  @UseGuards(CsrfGuard)
  @ApiOperation({ summary: 'Запуск скрипта' })
  @ApiResponse({ status: 200, description: 'Запуск инициирован' })
  async startScript(@Param('id') id: string, @Request() req) {
    return this.scriptsService.startScript(id, req.user.id);
  }

  @Post(':id/stop')
  @UseGuards(CsrfGuard)
  @ApiOperation({ summary: 'Остановка скрипта' })
  @ApiResponse({ status: 200, description: 'Остановка инициирована' })
  async stopScript(@Param('id') id: string, @Request() req) {
    return this.scriptsService.stopScript(id, req.user.id);
  }

  @Post(':id/restart')
  @UseGuards(CsrfGuard)
  @ApiOperation({ summary: 'Перезапуск скрипта' })
  @ApiResponse({ status: 200, description: 'Перезапуск инициирован' })
  async restartScript(@Param('id') id: string, @Request() req) {
    return this.scriptsService.restartScript(id, req.user.id);
  }

  @Get(':id/logs')
  @ApiOperation({ summary: 'Получение логов скрипта' })
  @ApiResponse({ status: 200, description: 'Логи скрипта' })
  async getScriptLogs(
    @Param('id') id: string,
    @Query('lines') lines: number = 200,
    @Request() req,
  ) {
    return this.scriptsService.getScriptLogs(id, req.user.id, lines);
  }

  @Delete(':id/logs')
  @UseGuards(CsrfGuard)
  @ApiOperation({ summary: 'Очистка логов скрипта' })
  @ApiResponse({ status: 200, description: 'Логи скрипта очищены' })
  async clearScriptLogs(
    @Param('id') id: string,
    @Request() req,
  ) {
    return this.scriptsService.clearScriptLogs(id, req.user.id);
  }

  @Get(':id/status')
  @ApiOperation({ summary: 'Получение статуса скрипта' })
  @ApiResponse({ status: 200, description: 'Статус скрипта' })
  async getScriptStatus(@Param('id') id: string, @Request() req) {
    return this.scriptsService.getScriptStatus(id, req.user.id);
  }

  @Delete(':id')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @UseGuards(CsrfGuard)
  @ApiOperation({ summary: 'Удаление скрипта' })
  @ApiResponse({ status: 200, description: 'Удаление инициировано' })
  @ApiResponse({ status: 429, description: 'Слишком много попыток' })
  async deleteScript(@Param('id') id: string, @Request() req) {
    return this.scriptsService.deleteScript(id, req.user.id);
  }

  @Get('jobs/:jobId/status')
  @ApiOperation({ summary: 'Получение статуса задачи' })
  @ApiResponse({ status: 200, description: 'Статус задачи' })
  async getJobStatus(@Param('jobId') jobId: string, @Request() req) {
    return this.scriptsService.getJobStatus(jobId, req.user.id);
  }

  @Post(':id/access')
  @UseGuards(CsrfGuard)
  @ApiOperation({ summary: 'Выдача доступа пользователю к скрипту' })
  @ApiResponse({ status: 201, description: 'Доступ выдан' })
  async grantScriptAccess(
    @Param('id') scriptId: string,
    @Body() body: { userId: string; permissions: any },
    @Request() req
  ) {
    return this.scriptsService.grantScriptAccess(scriptId, req.user.id, body.userId, body.permissions);
  }

  @Delete(':id/access/:userId')
  @UseGuards(CsrfGuard)
  @ApiOperation({ summary: 'Отзыв доступа пользователя к скрипту' })
  @ApiResponse({ status: 200, description: 'Доступ отозван' })
  async revokeScriptAccess(
    @Param('id') scriptId: string,
    @Param('userId') userId: string,
    @Request() req
  ) {
    return this.scriptsService.revokeScriptAccess(scriptId, req.user.id, userId);
  }

  @Get(':id/access-list')
  @ApiOperation({ summary: 'Получение списка пользователей с доступом к скрипту' })
  @ApiResponse({ status: 200, description: 'Список доступов' })
  async getScriptAccessList(@Param('id') scriptId: string, @Request() req) {
    return this.scriptsService.getScriptAccessList(scriptId, req.user.id);
  }

  @Get(':id/settings')
  @ApiOperation({ summary: 'Получение настроек скрипта' })
  @ApiResponse({ status: 200, description: 'Настройки скрипта' })
  async getScriptSettings(@Param('id') scriptId: string, @Request() req) {
    return this.scriptsService.getScriptSettings(scriptId, req.user.id);
  }

  @Put(':id/settings')
  @UseGuards(CsrfGuard)
  @ApiOperation({ summary: 'Обновление настроек скрипта' })
  @ApiResponse({ status: 200, description: 'Настройки обновлены' })
  async updateScriptSettings(
    @Param('id') scriptId: string,
    @Body() updateSettingsDto: UpdateScriptSettingsDto,
    @Request() req
  ) {
    return this.scriptsService.updateScriptSettings(scriptId, req.user.id, updateSettingsDto);
  }

  @Get(':id/env')
  @ApiOperation({ summary: 'Получение .env файла скрипта' })
  @ApiResponse({ status: 200, description: 'Содержимое .env файла' })
  async getScriptEnvFile(@Param('id') scriptId: string, @Request() req) {
    return this.scriptsService.getScriptEnvFile(scriptId, req.user.id);
  }

  @Put(':id/env')
  @UseGuards(CsrfGuard)
  @ApiOperation({ summary: 'Обновление .env файла скрипта' })
  @ApiResponse({ status: 200, description: '.env файл обновлен' })
  async updateScriptEnvFile(
    @Param('id') scriptId: string,
    @Body() body: { content: string },
    @Request() req
  ) {
    return this.scriptsService.updateScriptEnvFile(scriptId, req.user.id, body.content);
  }

  @Put(':id/auto-update')
  @UseGuards(CsrfGuard)
  @ApiOperation({ summary: 'Переключение автообновления скрипта' })
  @ApiResponse({ status: 200, description: 'Автообновление обновлено' })
  async toggleAutoUpdate(
    @Param('id') scriptId: string,
    @Body() body: { autoUpdate: boolean },
    @Request() req
  ) {
    return this.scriptsService.toggleAutoUpdate(scriptId, req.user.id, body.autoUpdate);
  }

  @Post(':id/freeze')
  @UseGuards(CsrfGuard)
  @ApiOperation({ summary: 'Заморозка подписки скрипта' })
  @ApiResponse({ status: 200, description: 'Подписка заморожена' })
  @ApiResponse({ status: 403, description: 'Нет прав на заморозку' })
  @ApiResponse({ status: 400, description: 'Скрипт уже заморожен или лимит исчерпан' })
  async freezeScript(@Param('id') id: string, @Request() req) {
    return this.scriptsService.freezeScript(id, req.user.id);
  }

  @Post(':id/unfreeze')
  @UseGuards(CsrfGuard)
  @ApiOperation({ summary: 'Разморозка подписки скрипта' })
  @ApiResponse({ status: 200, description: 'Подписка разморожена' })
  @ApiResponse({ status: 403, description: 'Нет прав на разморозку' })
  @ApiResponse({ status: 400, description: 'Скрипт не заморожен' })
  async unfreezeScript(@Param('id') id: string, @Request() req) {
    return this.scriptsService.unfreezeScript(id, req.user.id);
  }

}
