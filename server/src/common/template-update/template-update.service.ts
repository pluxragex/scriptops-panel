import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { SshService } from '../../ssh/ssh.service';
import { TelegramNotificationService } from '../notifications/telegram-notification.service';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

@Injectable()
export class TemplateUpdateService {
  private readonly logger = new Logger(TemplateUpdateService.name);
  private templateHashes = new Map<string, string>();

  constructor(
    private prisma: PrismaService,
    private sshService: SshService,
    private telegramNotificationService: TelegramNotificationService,
  ) {

    this.initializeTemplateHashes();
  }


  private async initializeTemplateHashes() {
    const templates = ['MCL_Template', 'Weekly_Template', 'Alliance_Template'];
    const templatesBaseDir = process.env.TEMPLATES_BASE_DIR || path.join(process.cwd(), 'templates', 'scripts');

    for (const template of templates) {
      try {
        const templatePath = path.join(templatesBaseDir, template);
        const hash = await this.calculateDirectoryHash(templatePath);
        this.templateHashes.set(template, hash);
        this.logger.log(`Инициализирован хеш для шаблона ${template}: ${hash.substring(0, 8)}...`);
      } catch (error) {
        this.logger.warn(`Не удалось инициализировать хеш для шаблона ${template}: ${error.message}`);
      }
    }
  }


  private async calculateDirectoryHash(dirPath: string): Promise<string> {
    try {
      const stats = await fs.stat(dirPath);
      if (!stats.isDirectory()) {
        throw new Error(`${dirPath} не является директорией`);
      }

      const files = await this.getAllFiles(dirPath);
      const fileHashes: string[] = [];

      for (const file of files) {
        try {
          const content = await fs.readFile(file);
          const hash = crypto.createHash('sha256').update(content).digest('hex');
          const relativePath = path.relative(dirPath, file);
          fileHashes.push(`${relativePath}:${hash}`);
        } catch (error) {

          this.logger.warn(`Не удалось прочитать файл ${file}: ${error.message}`);
        }
      }


      fileHashes.sort();
      const combined = fileHashes.join('\n');
      return crypto.createHash('sha256').update(combined).digest('hex');
    } catch (error) {
      this.logger.error(`Ошибка вычисления хеша директории ${dirPath}: ${error.message}`);
      throw error;
    }
  }


  private async getAllFiles(dirPath: string): Promise<string[]> {
    const files: string[] = [];
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);


      if (entry.name.startsWith('.') && entry.name !== '.env') {
        continue;
      }

      if (entry.isDirectory()) {
        const subFiles = await this.getAllFiles(fullPath);
        files.push(...subFiles);
      } else {
        files.push(fullPath);
      }
    }

    return files;
  }


  private getTemplateName(scriptType: string): string | null {
    switch (scriptType) {
      case 'CYBER_LEAGUE':
        return 'MCL_Template';
      case 'WEEKLY_CUP':
        return 'Weekly_Template';
      case 'ALLIANCE_BOT':
        return 'Alliance_Template';
      default:
        return null;
    }
  }


  @Cron(CronExpression.EVERY_HOUR)
  async checkAndUpdateTemplates() {
    this.logger.log('Запуск проверки обновлений шаблонов...');

    const templates = ['MCL_Template', 'Weekly_Template', 'Alliance_Template'];
    const templatesBaseDir = process.env.TEMPLATES_BASE_DIR || path.join(process.cwd(), 'templates', 'scripts');

    for (const template of templates) {
      try {
        const templatePath = path.join(templatesBaseDir, template);


        try {
          await fs.access(templatePath);
        } catch {
          this.logger.warn(`Шаблон ${template} не найден по пути ${templatePath}`);
          continue;
        }


        const currentHash = await this.calculateDirectoryHash(templatePath);
        const previousHash = this.templateHashes.get(template);


        if (previousHash && currentHash !== previousHash) {
          this.logger.log(`Обнаружено обновление шаблона ${template}. Старый хеш: ${previousHash.substring(0, 8)}..., новый: ${currentHash.substring(0, 8)}...`);


          let scriptType: string;
          if (template === 'MCL_Template') {
            scriptType = 'CYBER_LEAGUE';
          } else if (template === 'Weekly_Template') {
            scriptType = 'WEEKLY_CUP';
          } else {
            scriptType = 'ALLIANCE_BOT';
          }


          await this.updateScriptsForTemplate(template, templatePath, scriptType);


          this.templateHashes.set(template, currentHash);
        } else if (!previousHash) {

          this.templateHashes.set(template, currentHash);
          this.logger.log(`Инициализирован хеш для шаблона ${template}`);
        }
      } catch (error) {
        this.logger.error(`Ошибка при проверке шаблона ${template}: ${error.message}`);
      }
    }
  }


  private async updateScriptsForTemplate(templateName: string, templatePath: string, scriptType: string) {

    const scripts = await this.prisma.script.findMany({
      where: {
        type: scriptType as any,
        autoUpdate: true,
      },
      include: {
        server: true,
        owner: true,
      },
    });

    this.logger.log(`Найдено ${scripts.length} скриптов для обновления из шаблона ${templateName}`);

    for (const script of scripts) {
      try {
        await this.updateScriptFromTemplate(script, templatePath);
      } catch (error) {
        this.logger.error(`Ошибка обновления скрипта ${script.id}: ${error.message}`);
      }
    }
  }


  private async updateScriptFromTemplate(script: any, templatePath: string) {
    this.logger.log(`Обновление скрипта ${script.id} (${script.name}) из шаблона...`);

    try {

      let envContent = '';
      try {
        envContent = await this.sshService.readEnvFile(script.serverId, script.pathOnServer);
      } catch {

      }


      const wasRunning = script.status === 'RUNNING';
      if (wasRunning) {
        this.logger.log(`Останавливаем скрипт ${script.id} перед обновлением...`);
        await this.sshService.pm2Stop(script.serverId, script.pm2Name);


        await this.prisma.script.update({
          where: { id: script.id },
          data: { status: 'STOPPED' as any }
        });
      }


      const backupPath = `${script.pathOnServer}.backup.${Date.now()}`;
      try {
        await this.sshService.executeCommand(
          script.serverId,
          `cp -r "${script.pathOnServer}" "${backupPath}"`
        );
        this.logger.log(`Создана резервная копия: ${backupPath}`);
      } catch (error) {
        this.logger.warn(`Не удалось создать резервную копию: ${error.message}`);
      }


      this.logger.log(`Загрузка обновленного шаблона в ${script.pathOnServer}...`);
      await this.sshService.uploadDirectory(script.serverId, templatePath, script.pathOnServer);


      if (envContent) {
        await this.sshService.writeEnvFile(script.serverId, script.pathOnServer, envContent);
        this.logger.log(`Восстановлен .env файл для скрипта ${script.id}`);
      }


      this.logger.log(`Установка зависимостей для скрипта ${script.id}...`);
      await this.installDependencies(script.serverId, script.pathOnServer);


      await this.extractZipFilesIfNeeded(script.serverId, script.pathOnServer);


      await this.sshService.executeCommand(
        script.serverId,
        `chmod -R 755 "${script.pathOnServer}"`
      );


      try {
        await this.sshService.executeCommand(script.serverId, `rm -rf "${backupPath}"`);
      } catch (error) {
        this.logger.warn(`Не удалось удалить резервную копию: ${error.message}`);
      }


      const templateName = path.basename(templatePath);
      await this.prisma.auditLog.create({
        data: {
          actorId: script.ownerId,
          actionType: 'SCRIPT_DEPLOY',
          targetScriptId: script.id,
          details: {
            type: 'AUTO_UPDATE',
            templateName,
            wasRunning,
            timestamp: new Date().toISOString(),
          },
        },
      });

      this.logger.log(`Скрипт ${script.id} успешно обновлен из шаблона`);


      await this.telegramNotificationService.sendScriptUpdatedNotification(
        script.ownerId,
        script.name,
        script.id,
        templateName
      );


      if (wasRunning) {
        this.logger.log(`Перезапуск скрипта ${script.id}...`);
        await this.sshService.pm2Start(script.serverId, script.pathOnServer, script.pm2Name);

        await this.prisma.script.update({
          where: { id: script.id },
          data: { status: 'RUNNING' as any }
        });
      }
    } catch (error) {
      this.logger.error(`Ошибка обновления скрипта ${script.id}: ${error.message}`);
      throw error;
    }
  }


  private async installDependencies(serverId: string, scriptPath: string): Promise<void> {
    try {

      const checkPyResult = await this.sshService.executeCommand(
        serverId,
        `test -f "${scriptPath}/startbot.py" && echo "exists" || echo "not_exists"`
      );

      if (checkPyResult.stdout.trim() === 'exists') {
        this.logger.log(`Обнаружен startbot.py, устанавливаем Python зависимости...`);

        const checkRequirementsResult = await this.sshService.executeCommand(
          serverId,
          `test -f "${scriptPath}/requirements.txt" && echo "exists" || echo "not_exists"`
        );

        if (checkRequirementsResult.stdout.trim() === 'exists') {
          const installCommand = `cd "${scriptPath}" && pip install -r requirements.txt`;
          const result = await this.sshService.executeCommand(serverId, installCommand);

          if (result.code !== 0) {
            this.logger.warn(`Предупреждение при установке Python зависимостей: ${result.stderr}`);
          } else {
            this.logger.log(`Python зависимости установлены успешно`);
          }
        }
        return;
      }


      const checkJsResult = await this.sshService.executeCommand(
        serverId,
        `test -f "${scriptPath}/startbot.js" && echo "exists" || echo "not_exists"`
      );

      if (checkJsResult.stdout.trim() === 'exists') {
        this.logger.log(`Обнаружен startbot.js, устанавливаем Node.js зависимости...`);

        const checkPackageJsonResult = await this.sshService.executeCommand(
          serverId,
          `test -f "${scriptPath}/package.json" && echo "exists" || echo "not_exists"`
        );

        if (checkPackageJsonResult.stdout.trim() === 'exists') {
          const installCommand = `cd "${scriptPath}" && npm install`;
          const result = await this.sshService.executeCommand(serverId, installCommand);

          if (result.code !== 0) {
            this.logger.warn(`Предупреждение при установке Node.js зависимостей: ${result.stderr}`);
          } else {
            this.logger.log(`Node.js зависимости установлены успешно`);
          }
        }
      }
    } catch (error) {
      this.logger.error(`Ошибка при установке зависимостей для ${scriptPath}: ${error.message}`);

    }
  }


  private async extractZipFilesIfNeeded(serverId: string, scriptPath: string): Promise<void> {
    try {

      const findZipCommand = `find "${scriptPath}" -maxdepth 1 -type f -name "*.zip"`;
      const findResult = await this.sshService.executeCommand(serverId, findZipCommand);

      if (findResult.code !== 0) {

        if (process.env.LOG_LEVEL === 'debug') {
          this.logger.debug(`Ошибка поиска .zip файлов в ${scriptPath}: ${findResult.stderr}`);
        }
        return;
      }


      const zipFiles = findResult.stdout
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

      if (zipFiles.length === 0) {
        if (process.env.LOG_LEVEL === 'debug') {
          this.logger.debug(`Не найдено .zip файлов в ${scriptPath}`);
        }
        return;
      }


      for (const zipFile of zipFiles) {
        try {
          this.logger.log(`Распаковка ${zipFile} в ${scriptPath}...`);


          const unzipCommand = `cd "${scriptPath}" && unzip -o "${zipFile}" -d "${scriptPath}"`;
          const unzipResult = await this.sshService.executeCommand(serverId, unzipCommand);

          if (unzipResult.code === 0) {
            this.logger.log(`Успешно распакован ${zipFile}`);


            try {
              await this.sshService.executeCommand(serverId, `rm -f "${zipFile}"`);
              this.logger.log(`Удален архив ${zipFile} после успешной распаковки`);
            } catch (deleteError) {

              this.logger.warn(`Не удалось удалить архив ${zipFile} после распаковки: ${deleteError.message}`);
            }
          } else {
            this.logger.warn(`Не удалось распаковать ${zipFile}: ${unzipResult.stderr}`);
          }
        } catch (error) {

          this.logger.error(`Ошибка при распаковке ${zipFile}:`, error);
        }
      }
    } catch (error) {

      this.logger.error(`Ошибка при поиске и распаковке .zip файлов для ${scriptPath}:`, error);
    }
  }
}

