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
  Request
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

import { NewsService } from './news.service';
import { CreateNewsDto } from './dto/create-news.dto';
import { UpdateNewsDto } from './dto/update-news.dto';
import { NewsQueryDto } from './dto/news-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@ApiTags('Новости')
@Controller('news')
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  @Get()
  @ApiOperation({ summary: 'Получение списка новостей' })
  @ApiResponse({ status: 200, description: 'Список новостей' })
  @ApiQuery({ name: 'page', required: false, description: 'Номер страницы' })
  @ApiQuery({ name: 'limit', required: false, description: 'Количество новостей на странице' })
  @ApiQuery({ name: 'published', required: false, description: 'Показывать только опубликованные' })
  @ApiQuery({ name: 'featured', required: false, description: 'Показывать только рекомендуемые' })
  @ApiQuery({ name: 'search', required: false, description: 'Поиск по заголовку или содержимому' })
  async getNews(@Query() query: NewsQueryDto) {
    return this.newsService.getNews(query);
  }

  @Get('featured')
  @ApiOperation({ summary: 'Получение рекомендуемых новостей' })
  @ApiResponse({ status: 200, description: 'Список рекомендуемых новостей' })
  @ApiQuery({ name: 'limit', required: false, description: 'Количество новостей' })
  async getFeaturedNews(@Query('limit') limit?: number) {
    return this.newsService.getFeaturedNews(limit);
  }

  @Get('latest')
  @ApiOperation({ summary: 'Получение последних новостей' })
  @ApiResponse({ status: 200, description: 'Список последних новостей' })
  @ApiQuery({ name: 'limit', required: false, description: 'Количество новостей' })
  async getLatestNews(@Query('limit') limit?: number) {
    return this.newsService.getLatestNews(limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получение новости по ID или slug' })
  @ApiResponse({ status: 200, description: 'Новость' })
  @ApiResponse({ status: 404, description: 'Новость не найдена' })
  async getNewsById(
    @Param('id') id: string,
    @Request() req
  ) {
    const ipAddress = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    return this.newsService.getNewsById(id, req.user?.id, ipAddress, userAgent);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Получение статистики просмотров новости' })
  @ApiResponse({ status: 200, description: 'Статистика просмотров' })
  @ApiResponse({ status: 404, description: 'Новость не найдена' })
  async getNewsStats(@Param('id') id: string) {
    return this.newsService.getNewsViewStats(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Создание новой новости' })
  @ApiResponse({ status: 201, description: 'Новость создана' })
  @ApiResponse({ status: 403, description: 'Нет прав на создание новости' })
  async createNews(@Body() createNewsDto: CreateNewsDto, @Request() req) {
    return this.newsService.createNews(createNewsDto, req.user.id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Обновление новости' })
  @ApiResponse({ status: 200, description: 'Новость обновлена' })
  @ApiResponse({ status: 403, description: 'Нет прав на редактирование новости' })
  @ApiResponse({ status: 404, description: 'Новость не найдена' })
  async updateNews(
    @Param('id') id: string,
    @Body() updateNewsDto: UpdateNewsDto,
    @Request() req,
  ) {
    return this.newsService.updateNews(id, updateNewsDto, req.user.id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Удаление новости' })
  @ApiResponse({ status: 200, description: 'Новость удалена' })
  @ApiResponse({ status: 403, description: 'Нет прав на удаление новости' })
  @ApiResponse({ status: 404, description: 'Новость не найдена' })
  async deleteNews(@Param('id') id: string, @Request() req) {
    return this.newsService.deleteNews(id, req.user.id);
  }
}
