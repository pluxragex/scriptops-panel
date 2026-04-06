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
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { AdminService } from './admin.service';
import { IssueScriptDto } from './dto/issue-script.dto';
import { ExtendScriptDto } from './dto/extend-script.dto';
import { CreateServerDto } from './dto/create-server.dto';
import { UpdateServerDto } from './dto/update-server.dto';
import { CreateServerKeyDto } from './dto/create-server-key.dto';
import { UpdateServerKeyDto } from './dto/update-server-key.dto';
import { ChangeUserPasswordDto } from './dto/change-user-password.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { CreateScheduledTaskDto } from './dto/create-scheduled-task.dto';
import { UpdateScheduledTaskDto } from './dto/update-scheduled-task.dto';
import { CreateNewsDto } from '../news/dto/create-news.dto';
import { UpdateNewsDto } from '../news/dto/update-news.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CsrfGuard } from '../common/guards/csrf.guard';

@ApiTags('Админ-панель')
@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('check-access')
  @ApiOperation({ summary: 'Проверка доступа к админ панели' })
  @ApiResponse({ status: 200, description: 'Информация о доступе' })
  async checkAccess(@Request() req) {
    return {
      hasAccess: true,
      user: {
        id: req.user.id,
        email: req.user.email,
        username: req.user.username,
        role: req.user.role,
      },
    };
  }

  @Get('users')
  @ApiOperation({ summary: 'Получение списка всех пользователей' })
  @ApiResponse({ status: 200, description: 'Список пользователей' })
  async getAllUsers(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('search') search?: string,
  ) {
    return this.adminService.getAllUsers(page, limit, search);
  }

  @Get('users/:id/scripts')
  @ApiOperation({ summary: 'Получение скриптов пользователя' })
  @ApiResponse({ status: 200, description: 'Список скриптов пользователя' })
  async getUserScripts(@Param('id') userId: string) {
    return this.adminService.getUserScripts(userId);
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Получение пользователя по ID' })
  @ApiResponse({ status: 200, description: 'Данные пользователя' })
  async getUserById(@Param('id') id: string) {
    return this.adminService.getUserById(id);
  }

  @Put('users/:id/block')
  @UseGuards(CsrfGuard)
  @ApiOperation({ summary: 'Блокировка/разблокировка пользователя' })
  @ApiResponse({ status: 200, description: 'Статус пользователя изменен' })
  async toggleUserBlock(@Param('id') id: string, @Request() req) {
    return this.adminService.toggleUserBlock(id, req.user.id);
  }

  @Put('users/:id/role')
  @UseGuards(CsrfGuard)
  @ApiOperation({ summary: 'Изменение роли пользователя' })
  @ApiResponse({ status: 200, description: 'Роль пользователя изменена' })
  async changeUserRole(
    @Param('id') id: string,
    @Body('role') role: string,
    @Request() req,
  ) {
    return this.adminService.changeUserRole(id, role, req.user.id);
  }

  @Put('users/:id/password')
  @UseGuards(CsrfGuard)
  @ApiOperation({ summary: 'Изменение пароля пользователя администратором' })
  @ApiResponse({ status: 200, description: 'Пароль пользователя изменен' })
  async changeUserPassword(
    @Param('id') id: string,
    @Body() changePasswordDto: ChangeUserPasswordDto,
    @Request() req,
  ) {
    return this.adminService.changeUserPassword(id, changePasswordDto, req.user.id);
  }

  @Post('users')
  @UseGuards(CsrfGuard)
  @ApiOperation({ summary: 'Создание нового пользователя администратором' })
  @ApiResponse({ status: 201, description: 'Пользователь создан' })
  async createUser(
    @Body() createUserDto: CreateUserDto,
    @Request() req,
  ) {
    return this.adminService.createUser(createUserDto, req.user.id);
  }

  @Get('scripts')
  @ApiOperation({ summary: 'Получение списка всех скриптов' })
  @ApiResponse({ status: 200, description: 'Список скриптов' })
  async getAllScripts(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('search') search?: string,
  ) {
    return this.adminService.getAllScripts(page, limit, search);
  }

  @Post('scripts/:id/issue')
  @UseGuards(CsrfGuard)
  @ApiOperation({ summary: 'Выдача скрипта пользователю' })
  @ApiResponse({ status: 201, description: 'Скрипт выдан пользователю' })
  async issueScript(
    @Param('id') id: string,
    @Body() issueScriptDto: IssueScriptDto,
    @Request() req,
  ) {
    return this.adminService.issueScript(id, issueScriptDto, req.user.id);
  }

  @Post('scripts/:id/revoke')
  @UseGuards(CsrfGuard)
  @ApiOperation({ summary: 'Отзыв скрипта' })
  @ApiResponse({ status: 200, description: 'Отзыв скрипта инициирован' })
  async revokeScript(@Param('id') id: string, @Request() req) {
    return this.adminService.revokeScript(id, req.user.id);
  }

  @Post('scripts/:id/extend')
  @UseGuards(CsrfGuard)
  @ApiOperation({ summary: 'Продление срока скрипта' })
  @ApiResponse({ status: 200, description: 'Срок скрипта продлен' })
  async extendScript(
    @Param('id') id: string,
    @Body() extendScriptDto: ExtendScriptDto,
    @Request() req,
  ) {
    return this.adminService.extendScript(id, extendScriptDto, req.user.id);
  }

  @Put('scripts/:id/name')
  @UseGuards(CsrfGuard)
  @ApiOperation({ summary: 'Обновление имени скрипта' })
  @ApiResponse({ status: 200, description: 'Имя скрипта обновлено' })
  async updateScriptName(
    @Param('id') id: string,
    @Body() body: { name: string },
    @Request() req,
  ) {
    return this.adminService.updateScriptName(id, body.name, req.user.id);
  }

  @Put('scripts/:id/owner')
  @UseGuards(CsrfGuard)
  @ApiOperation({ summary: 'Обновление владельца скрипта' })
  @ApiResponse({ status: 200, description: 'Владелец скрипта обновлен' })
  async updateScriptOwner(
    @Param('id') id: string,
    @Body() body: { ownerId: string },
    @Request() req,
  ) {
    return this.adminService.updateScriptOwner(id, body.ownerId, req.user.id);
  }

  @Get('servers')
  @ApiOperation({ summary: 'Получение списка всех серверов' })
  @ApiResponse({ status: 200, description: 'Список серверов' })
  async getAllServers() {
    return this.adminService.getAllServers();
  }

  @Get('servers/:id/scripts-stats')
  @ApiOperation({ summary: 'Получение статистики скриптов на сервере' })
  @ApiResponse({ status: 200, description: 'Статистика скриптов на сервере' })
  async getServerScriptsStats(@Param('id') id: string) {
    return this.adminService.getServerScriptsStats(id);
  }

  @Post('servers')
  @UseGuards(CsrfGuard)
  @ApiOperation({ summary: 'Создание нового сервера' })
  @ApiResponse({ status: 201, description: 'Сервер создан' })
  async createServer(@Body() createServerDto: CreateServerDto, @Request() req) {
    return this.adminService.createServer(createServerDto, req.user.id);
  }

  @Put('servers/:id')
  @UseGuards(CsrfGuard)
  @ApiOperation({ summary: 'Обновление сервера' })
  @ApiResponse({ status: 200, description: 'Сервер обновлен' })
  async updateServer(
    @Param('id') id: string,
    @Body() updateServerDto: UpdateServerDto,
    @Request() req,
  ) {
    return this.adminService.updateServer(id, updateServerDto, req.user.id);
  }

  @Post('servers/:id/test-connection')
  @ApiOperation({ summary: 'Тестирование соединения с сервером' })
  @ApiResponse({ status: 200, description: 'Результат тестирования' })
  async testServerConnection(@Param('id') id: string, @Request() req) {
    return this.adminService.testServerConnection(id, req.user.id);
  }

  @Get('server-keys')
  @ApiOperation({ summary: 'Получение списка SSH ключей' })
  @ApiResponse({ status: 200, description: 'Список SSH ключей' })
  async getAllServerKeys() {
    return this.adminService.getAllServerKeys();
  }

  @Post('server-keys')
  @UseGuards(CsrfGuard)
  @ApiOperation({ summary: 'Создание нового SSH ключа' })
  @ApiResponse({ status: 201, description: 'SSH ключ создан' })
  async createServerKey(@Body() createServerKeyDto: CreateServerKeyDto, @Request() req) {
    return this.adminService.createServerKey(createServerKeyDto, req.user.id);
  }

  @Put('server-keys/:id')
  @UseGuards(CsrfGuard)
  @ApiOperation({ summary: 'Обновление SSH ключа' })
  @ApiResponse({ status: 200, description: 'SSH ключ обновлен' })
  async updateServerKey(
    @Param('id') id: string,
    @Body() updateServerKeyDto: UpdateServerKeyDto,
    @Request() req,
  ) {
    return this.adminService.updateServerKey(id, updateServerKeyDto, req.user.id);
  }

  @Delete('server-keys/:id')
  @UseGuards(CsrfGuard)
  @ApiOperation({ summary: 'Удаление SSH ключа' })
  @ApiResponse({ status: 200, description: 'SSH ключ удален' })
  async deleteServerKey(@Param('id') id: string, @Request() req) {
    return this.adminService.deleteServerKey(id, req.user.id);
  }

  @Delete('servers/:id')
  @UseGuards(CsrfGuard)
  @ApiOperation({ summary: 'Удаление сервера' })
  @ApiResponse({ status: 200, description: 'Сервер удален' })
  async deleteServer(@Param('id') id: string, @Request() req) {
    return this.adminService.deleteServer(id, req.user.id);
  }

  @Get('audit-logs')
  @ApiOperation({ summary: 'Получение журнала аудита' })
  @ApiResponse({ status: 200, description: 'Журнал аудита' })
  async getAuditLogs(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 50,
    @Query('actionType') actionType?: string,
    @Query('userId') userId?: string,
  ) {
    return this.adminService.getAuditLogs(page, limit, actionType, userId);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Получение статистики системы' })
  @ApiResponse({ status: 200, description: 'Статистика системы' })
  async getSystemStats() {
    return this.adminService.getSystemStats();
  }

  @Get('server-stats')
  @ApiOperation({ summary: 'Получение статистики серверов' })
  @ApiResponse({ status: 200, description: 'Статистика серверов' })
  async getServerStats() {
    return this.adminService.getServerStats();
  }

  @Get('news')
  @ApiOperation({ summary: 'Получение списка всех новостей' })
  @ApiResponse({ status: 200, description: 'Список новостей' })
  async getAllNews(@Query('page') page: number = 1, @Query('limit') limit: number = 20) {
    return this.adminService.getAllNews(page, limit);
  }

  @Get('news/:id')
  @ApiOperation({ summary: 'Получение новости по ID' })
  @ApiResponse({ status: 200, description: 'Новость' })
  @ApiResponse({ status: 404, description: 'Новость не найдена' })
  async getNewsById(@Param('id') id: string) {
    return this.adminService.getNewsById(id);
  }

  @Post('news')
  @UseGuards(CsrfGuard)
  @ApiOperation({ summary: 'Создание новой новости' })
  @ApiResponse({ status: 201, description: 'Новость создана' })
  async createNews(@Body() createNewsDto: CreateNewsDto, @Request() req) {
    return this.adminService.createNews(createNewsDto, req.user.id);
  }

  @Put('news/:id')
  @UseGuards(CsrfGuard)
  @ApiOperation({ summary: 'Обновление новости' })
  @ApiResponse({ status: 200, description: 'Новость обновлена' })
  @ApiResponse({ status: 404, description: 'Новость не найдена' })
  async updateNews(
    @Param('id') id: string,
    @Body() updateNewsDto: UpdateNewsDto,
    @Request() req,
  ) {
    return this.adminService.updateNews(id, updateNewsDto, req.user.id);
  }

  @Delete('news/:id')
  @UseGuards(CsrfGuard)
  @ApiOperation({ summary: 'Удаление новости' })
  @ApiResponse({ status: 200, description: 'Новость удалена' })
  @ApiResponse({ status: 404, description: 'Новость не найдена' })
  async deleteNews(@Param('id') id: string, @Request() req) {
    return this.adminService.deleteNews(id, req.user.id);
  }

  @Get('scheduled-tasks')
  @ApiOperation({ summary: 'Получение списка задач планировщика' })
  @ApiResponse({ status: 200, description: 'Список задач' })
  async getScheduledTasks() {
    return this.adminService.getScheduledTasks();
  }

  @Get('scheduled-tasks/:id')
  @ApiOperation({ summary: 'Получение задачи планировщика по ID' })
  @ApiResponse({ status: 200, description: 'Задача найдена' })
  @ApiResponse({ status: 404, description: 'Задача не найдена' })
  async getScheduledTask(@Param('id') id: string) {
    return this.adminService.getScheduledTask(id);
  }

  @Post('scheduled-tasks')
  @UseGuards(CsrfGuard)
  @ApiOperation({ summary: 'Создание новой задачи планировщика' })
  @ApiResponse({ status: 201, description: 'Задача создана' })
  async createScheduledTask(
    @Body() createTaskDto: CreateScheduledTaskDto,
    @Request() req,
  ) {
    return this.adminService.createScheduledTask(createTaskDto, req.user.id);
  }

  @Put('scheduled-tasks/:id')
  @UseGuards(CsrfGuard)
  @ApiOperation({ summary: 'Обновление задачи планировщика' })
  @ApiResponse({ status: 200, description: 'Задача обновлена' })
  @ApiResponse({ status: 404, description: 'Задача не найдена' })
  async updateScheduledTask(
    @Param('id') id: string,
    @Body() updateTaskDto: UpdateScheduledTaskDto,
    @Request() req,
  ) {
    return this.adminService.updateScheduledTask(id, updateTaskDto, req.user.id);
  }

  @Delete('scheduled-tasks/:id')
  @UseGuards(CsrfGuard)
  @ApiOperation({ summary: 'Удаление задачи планировщика' })
  @ApiResponse({ status: 200, description: 'Задача удалена' })
  @ApiResponse({ status: 404, description: 'Задача не найдена' })
  async deleteScheduledTask(@Param('id') id: string, @Request() req) {
    return this.adminService.deleteScheduledTask(id, req.user.id);
  }

  @Post('scheduled-tasks/:id/run')
  @UseGuards(CsrfGuard)
  @ApiOperation({ summary: 'Ручной запуск задачи планировщика' })
  @ApiResponse({ status: 200, description: 'Задача запущена' })
  @ApiResponse({ status: 404, description: 'Задача не найдена' })
  async runScheduledTask(@Param('id') id: string, @Request() req) {
    return this.adminService.runScheduledTask(id, req.user.id);
  }

  @Get('queues/stats')
  @ApiOperation({ summary: 'Получение статистики очередей' })
  @ApiResponse({ status: 200, description: 'Статистика очередей' })
  async getQueueStats() {
    return this.adminService.getQueueStats();
  }

  @Get('queues/:queueName/jobs')
  @ApiOperation({ summary: 'Получение списка задач из очереди' })
  @ApiResponse({ status: 200, description: 'Список задач очереди' })
  async getQueueJobs(
    @Param('queueName') queueName: 'deployment' | 'script' | 'expiry',
    @Query('state') state?: string,
    @Query('limit') limit?: number,
  ) {
    const states = state ? state.split(',') : undefined;
    return this.adminService.getQueueJobs(queueName, states, limit ? parseInt(limit.toString()) : undefined);
  }

  @Post('queues/:queueName/clear')
  @UseGuards(CsrfGuard)
  @ApiOperation({ summary: 'Очистка отдельной очереди' })
  @ApiResponse({ status: 200, description: 'Очередь очищена' })
  async clearQueue(
    @Param('queueName') queueName: 'deployment' | 'script' | 'expiry',
    @Body('states') states?: string[],
    @Request() req?: any,
  ) {
    return this.adminService.clearQueue(queueName, req.user.id, states);
  }

  @Post('queues/clear')
  @UseGuards(CsrfGuard)
  @ApiOperation({ summary: 'Очистка всех задач из очередей' })
  @ApiResponse({ status: 200, description: 'Все задачи очищены' })
  async clearAllQueues(@Request() req) {
    return this.adminService.clearAllQueues(req.user.id);
  }

}
