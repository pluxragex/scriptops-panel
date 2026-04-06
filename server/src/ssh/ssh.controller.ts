import { Controller, Post, Get, Delete, Body, UseGuards, Request, Query, Param, Res, UploadedFile, UseInterceptors, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { Response } from 'express';

import { SshService } from './ssh.service';
import { TestConnectionDto } from './dto/test-connection.dto';
import { ListFilesDto } from './dto/list-files.dto';
import { CreateDirectoryDto } from './dto/create-directory.dto';
import { DeleteFileDto } from './dto/delete-file.dto';
import { ExecuteCommandDto } from './dto/execute-command.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@ApiTags('SSH операции')
@Controller('ssh')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
export class SshController {
  constructor(private readonly sshService: SshService) {}

  @Post('test-connection')
  @ApiOperation({ summary: 'Тестирование SSH соединения с сервером' })
  @ApiResponse({ status: 200, description: 'Результат тестирования соединения' })
  async testConnection(@Body() testConnectionDto: TestConnectionDto) {
    const isConnected = await this.sshService.testConnection(testConnectionDto.serverId);

    return {
      success: isConnected,
      message: isConnected ? 'Соединение успешно установлено' : 'Не удалось установить соединение',
    };
  }

  @Get('files')
  @ApiOperation({ summary: 'Получение списка файлов и директорий' })
  @ApiResponse({ status: 200, description: 'Список файлов и директорий' })
  async listFiles(@Query('serverId') serverId: string, @Query('path') path?: string) {
    if (!serverId) {
      throw new BadRequestException('serverId обязателен');
    }
    return this.sshService.listFiles(serverId, path || '/');
  }

  @Post('directory')
  @ApiOperation({ summary: 'Создание директории' })
  @ApiResponse({ status: 200, description: 'Директория создана' })
  async createDirectory(@Body() createDirectoryDto: CreateDirectoryDto) {
    await this.sshService.createDirectory(createDirectoryDto.serverId, createDirectoryDto.path);
    return { message: 'Директория успешно создана' };
  }

  @Delete('file')
  @ApiOperation({ summary: 'Удаление файла или директории' })
  @ApiResponse({ status: 200, description: 'Файл или директория удалены' })
  async deleteFile(@Body() deleteFileDto: DeleteFileDto) {
    await this.sshService.deleteFile(deleteFileDto.serverId, deleteFileDto.path);
    return { message: 'Файл или директория успешно удалены' };
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', {
    limits: {
      fileSize: 100 * 1024 * 1024,
    },
  }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        serverId: {
          type: 'string',
        },
        path: {
          type: 'string',
        },
      },
    },
  })
  @ApiOperation({ summary: 'Загрузка файла на сервер' })
  @ApiResponse({ status: 200, description: 'Файл загружен' })
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('serverId') serverId: string,
    @Body('path') remotePath: string,
  ) {
    if (!file) {
      throw new BadRequestException('Файл не предоставлен');
    }
    if (!serverId) {
      throw new BadRequestException('serverId обязателен');
    }
    if (!remotePath) {
      throw new BadRequestException('path обязателен');
    }

    const fullPath = remotePath.endsWith('/')
      ? `${remotePath}${file.originalname}`
      : remotePath;

    await this.sshService.uploadFileFromBuffer(serverId, file.buffer, fullPath);
    return { message: 'Файл успешно загружен', path: fullPath };
  }

  @Get('download')
  @ApiOperation({ summary: 'Скачивание файла с сервера' })
  @ApiResponse({ status: 200, description: 'Файл скачан' })
  async downloadFile(
    @Query('serverId') serverId: string,
    @Query('path') remotePath: string,
    @Res() res: Response,
  ) {
    if (!serverId || !remotePath) {
      throw new BadRequestException('serverId и path обязательны');
    }

    const buffer = await this.sshService.downloadFileToBuffer(serverId, remotePath);
    const fileName = remotePath.split('/').pop() || 'file';

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(buffer);
  }

  @Post('execute-command')
  @ApiOperation({ summary: 'Выполнение команды на сервере' })
  @ApiResponse({ status: 200, description: 'Результат выполнения команды' })
  async executeCommand(@Body() executeCommandDto: ExecuteCommandDto) {
    if (!executeCommandDto.serverId || !executeCommandDto.command) {
      throw new BadRequestException('serverId и command обязательны');
    }

    const result = await this.sshService.executeCommand(
      executeCommandDto.serverId,
      executeCommandDto.command,
      executeCommandDto.cwd,
    );

    return {
      stdout: result.stdout,
      stderr: result.stderr,
      code: result.code,
      success: result.code === 0,
    };
  }
}
