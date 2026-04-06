import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NodeSSH } from 'node-ssh';
import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';

import { PrismaService } from '../common/prisma/prisma.service';

export interface SshConnectionConfig {
  host: string;
  port: number;
  username: string;
  privateKey: string;
}

export interface SshCommandResult {
  stdout: string;
  stderr: string;
  code: number;
}

export interface Pm2ProcessInfo {
  pid: number;
  name: string;
  status: string;
  uptime: number;
  cpu: number;
  memory: number;
}

@Injectable()
export class SshService {
  private readonly logger = new Logger(SshService.name);
  private sshConnections = new Map<string, NodeSSH>();

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}


  async getSshConnection(serverId: string): Promise<NodeSSH> {

    if (this.sshConnections.has(serverId)) {
      const connection = this.sshConnections.get(serverId);
      if (connection && connection.isConnected()) {
        return connection;
      }
    }


    const server = await this.prisma.server.findUnique({
      where: { id: serverId },
      include: { key: true },
    });

    if (!server) {
      throw new BadRequestException('Сервер не найден');
    }

    if (!server.isActive) {
      throw new BadRequestException('Сервер неактивен');
    }


    const privateKey = await this.decryptPrivateKey(server.key.privateKeyEncrypted);


    if (!this.isValidPrivateKey(privateKey)) {
      this.logger.error(`Неверный формат приватного ключа для сервера ${server.name}. Первые 100 символов: ${privateKey.substring(0, 100)}`);
      throw new BadRequestException('Неверный формат приватного ключа');
    }


    const ssh = new NodeSSH();

    try {
      await ssh.connect({
        host: server.host,
        port: server.port,
        username: server.sshUser,
        privateKey,

        tryKeyboard: true,

        readyTimeout: 30000,

        algorithms: {
          kex: [
            'diffie-hellman-group1-sha1',
            'ecdh-sha2-nistp256',
            'ecdh-sha2-nistp384',
            'ecdh-sha2-nistp521',
            'diffie-hellman-group14-sha1',
            'diffie-hellman-group-exchange-sha256',
            'diffie-hellman-group-exchange-sha1'
          ],
          cipher: [
            'aes128-ctr',
            'aes192-ctr',
            'aes256-ctr',
            'aes128-gcm',
            'aes256-gcm',
            'aes128-cbc',
            'aes192-cbc',
            'aes256-cbc'
          ],
          serverHostKey: [
            'ssh-rsa',
            'ssh-dss',
            'ecdsa-sha2-nistp256',
            'ecdsa-sha2-nistp384',
            'ecdsa-sha2-nistp521',
            'ssh-ed25519'
          ]
        }
      });

      this.sshConnections.set(serverId, ssh);

      return ssh;
    } catch (error) {

      const errorCode = error.code || error.level || 'UNKNOWN';
      const errorMsg = error.message || 'Connection failed';


      let errorType = 'Connection error';
      if (error.code === 'ECONNREFUSED') {
        errorType = 'Server unreachable';
      } else if (error.code === 'ETIMEDOUT') {
        errorType = 'Timeout';
      } else if (error.code === 'ENOTFOUND') {
        errorType = 'DNS error';
      } else if (errorMsg.includes('Authentication failed') || errorMsg.includes('authentication methods failed')) {
        errorType = 'Auth failed';
      } else if (errorMsg.includes('Host key verification failed')) {
        errorType = 'Host key error';
      }


      this.logger.error(
        `SSH ${errorType}: ${server.name} (${server.host}:${server.port}) - ${errorMsg}`,
        process.env.LOG_LEVEL === 'debug' ? error.stack : undefined,
        { serverId, code: errorCode, user: server.sshUser },
      );

      throw new BadRequestException(`Не удалось подключиться к серверу: ${errorMsg}`);
    }
  }


  async executeCommand(serverId: string, command: string, cwd?: string): Promise<SshCommandResult> {
    const ssh = await this.getSshConnection(serverId);

    try {
      const result = await ssh.execCommand(command, {
        cwd,
      });

      return {
        stdout: result.stdout,
        stderr: result.stderr,
        code: result.code,
      };
    } catch (error) {
      const errorMsg = error.message || 'Command execution failed';
      this.logger.error(`SSH command failed: ${serverId} - ${errorMsg}`, {
        serverId,
        command: command.substring(0, 50),
      });
      throw new BadRequestException(`Ошибка выполнения команды: ${errorMsg}`);
    }
  }


  async createDirectory(serverId: string, path: string, owner?: string): Promise<void> {

    const commands = [
      `mkdir -p "${path}"`,
      ...(owner ? [`chown -R ${owner}:${owner} "${path}"`] : []),
      `chmod 755 "${path}"`,
    ];

    let useSudo = false;

    for (const command of commands) {
      const result = await this.executeCommand(serverId, command);
      if (result.code !== 0) {
        useSudo = true;
        break;
      }
    }


    if (useSudo) {
      const sudoCommands = [
        `sudo mkdir -p "${path}"`,
        ...(owner ? [`sudo chown -R ${owner}:${owner} "${path}"`] : []),
        `sudo chmod 755 "${path}"`,
      ];

      for (const command of sudoCommands) {
        const result = await this.executeCommand(serverId, command);
        if (result.code !== 0) {
          throw new BadRequestException(`Ошибка создания директории: ${result.stderr}`);
        }
      }
    }
  }


  async uploadFile(serverId: string, localPath: string, remotePath: string): Promise<void> {
    const ssh = await this.getSshConnection(serverId);

    try {
      await ssh.putFile(localPath, remotePath);
    } catch (error) {
      this.logger.error(`Ошибка загрузки файла:`, error);
      throw new BadRequestException(`Ошибка загрузки файла: ${error.message}`);
    }
  }


  async uploadDirectory(serverId: string, localPath: string, remotePath: string): Promise<void> {
    const ssh = await this.getSshConnection(serverId);

    try {
      await ssh.putDirectory(localPath, remotePath, {
        recursive: true,
        concurrency: 5,
        validate: (itemPath: string) => {

          const baseName = path.basename(itemPath);
          return baseName === '.env' || !baseName.startsWith('.');
        },
        tick: (localPath: string, remotePath: string, error?: Error) => {
          if (error) {
            this.logger.warn(`Ошибка загрузки ${localPath}: ${error.message}`);
          }
        }
      });
    } catch (error) {
      this.logger.error(`Ошибка загрузки директории:`, error);
      throw new BadRequestException(`Ошибка загрузки директории: ${error.message}`);
    }
  }


  async downloadFile(serverId: string, remotePath: string, localPath: string): Promise<void> {
    const ssh = await this.getSshConnection(serverId);

    try {
      await ssh.getFile(localPath, remotePath);
    } catch (error) {
      this.logger.error(`Ошибка скачивания файла:`, error);
      throw new BadRequestException(`Ошибка скачивания файла: ${error.message}`);
    }
  }


  async readJsonFile(serverId: string, remotePath: string): Promise<any> {
    const ssh = await this.getSshConnection(serverId);

    try {
      const result = await this.executeCommand(serverId, `cat "${remotePath}"`);
      if (result.code !== 0) {

        if (result.stderr.includes('No such file')) {
          return [];
        }
        throw new BadRequestException(`Ошибка чтения файла: ${result.stderr}`);
      }

      try {
        return JSON.parse(result.stdout);
      } catch (parseError) {

        if (result.stdout.trim() === '') {
          return [];
        }
        throw new BadRequestException(`Ошибка парсинга JSON: ${parseError.message}`);
      }
    } catch (error) {
      this.logger.error(`Ошибка чтения JSON файла:`, error);
      throw new BadRequestException(`Ошибка чтения JSON файла: ${error.message}`);
    }
  }


  async writeJsonFile(serverId: string, remotePath: string, data: any): Promise<void> {
    const ssh = await this.getSshConnection(serverId);

    try {
      const jsonContent = JSON.stringify(data, null, 2);
      const tempFile = `/tmp/registrations_${Date.now()}.json`;


      const base64Content = Buffer.from(jsonContent, 'utf-8').toString('base64');


      const result = await this.executeCommand(
        serverId,
        `echo '${base64Content}' | base64 -d > "${tempFile}"`
      );

      if (result.code !== 0) {
        throw new BadRequestException(`Ошибка создания временного файла: ${result.stderr}`);
      }


      const moveResult = await this.executeCommand(serverId, `mv "${tempFile}" "${remotePath}"`);

      if (moveResult.code !== 0) {

        const sudoResult = await this.executeCommand(serverId, `sudo mv "${tempFile}" "${remotePath}"`);
        if (sudoResult.code !== 0) {
          throw new BadRequestException(`Ошибка перемещения файла: ${sudoResult.stderr}`);
        }
      }
    } catch (error) {
      this.logger.error(`Ошибка записи JSON файла:`, error);
      throw new BadRequestException(`Ошибка записи JSON файла: ${error.message}`);
    }
  }


  async extractArchive(serverId: string, archivePath: string, extractPath: string): Promise<void> {
    const command = `cd "${extractPath}" && tar -xzf "${archivePath}"`;
    const result = await this.executeCommand(serverId, command);

    if (result.code !== 0) {
      throw new BadRequestException(`Ошибка распаковки архива: ${result.stderr}`);
    }
  }


  async installDependencies(serverId: string, projectPath: string): Promise<void> {
    const command = `cd "${projectPath}" && npm install --production`;
    const result = await this.executeCommand(serverId, command);

    if (result.code !== 0) {
      throw new BadRequestException(`Ошибка установки зависимостей: ${result.stderr}`);
    }
  }


  async readEnvFile(serverId: string, scriptPath: string): Promise<string> {
    const command = `cat "${scriptPath}/.env" 2>/dev/null || echo ""`;
    const result = await this.executeCommand(serverId, command);

    if (result.code !== 0) {
      throw new BadRequestException(`Ошибка чтения .env файла: ${result.stderr}`);
    }

    return result.stdout;
  }

  async writeEnvFile(serverId: string, scriptPath: string, envContent: string): Promise<void> {

    const tempFile = `/tmp/env_${Date.now()}.txt`;


    const base64Content = Buffer.from(envContent, 'utf8').toString('base64');


    const writeCommand = `echo '${base64Content}' | base64 -d > "${tempFile}"`;

    const writeResult = await this.executeCommand(serverId, writeCommand);
    if (writeResult.code !== 0) {
      throw new BadRequestException(`Ошибка создания временного файла: ${writeResult.stderr}`);
    }


    const moveCommand = `mv "${tempFile}" "${scriptPath}/.env" && chmod 644 "${scriptPath}/.env"`;
    const moveResult = await this.executeCommand(serverId, moveCommand);

    if (moveResult.code !== 0) {
      throw new BadRequestException(`Ошибка записи .env файла: ${moveResult.stderr}`);
    }
  }


  private buildPm2Command(pm2Command: string): string {


    const escapedCommand = pm2Command.replace(/'/g, "'\\''");
    return `bash -lc 'source ~/.nvm/nvm.sh 2>/dev/null; source ~/.bashrc 2>/dev/null; source ~/.profile 2>/dev/null; export PATH="$PATH:/usr/bin:/usr/local/bin"; if command -v pm2 >/dev/null 2>&1; then pm2 ${escapedCommand}; elif [ -f /usr/local/bin/pm2 ]; then /usr/local/bin/pm2 ${escapedCommand}; elif [ -f /usr/bin/pm2 ]; then /usr/bin/pm2 ${escapedCommand}; else npx pm2 ${escapedCommand}; fi'`;
  }

  
  async pm2Start(serverId: string, scriptPath: string, pm2Name: string): Promise<void> {
    const checkPyCommand = `test -f "${scriptPath}/startbot.py"`;
    const checkPyResult = await this.executeCommand(serverId, checkPyCommand);

    let scriptFile: string;

    if (checkPyResult.code === 0) {
      scriptFile = 'startbot.py';
    } else {
      const checkJsCommand = `test -f "${scriptPath}/startbot.js"`;
      const checkJsResult = await this.executeCommand(serverId, checkJsCommand);

      if (checkJsResult.code === 0) {
        scriptFile = 'startbot.js';
      } else {
        throw new BadRequestException(`Файл startbot.py или startbot.js не найден в директории ${scriptPath}`);
      }
    }
    const pm2Command = `start ${scriptFile} --name "${pm2Name}"`;
    const command = `cd "${scriptPath}" && ${this.buildPm2Command(pm2Command)}`;
    const result = await this.executeCommand(serverId, command);

    if (result.code !== 0) {
      throw new BadRequestException(`Ошибка запуска PM2 процесса: ${result.stderr}`);
    }
  }

  async pm2Stop(serverId: string, pm2Name: string): Promise<void> {
    const command = this.buildPm2Command(`stop "${pm2Name}"`);
    const result = await this.executeCommand(serverId, command);

    if (result.code !== 0) {
      throw new BadRequestException(`Ошибка остановки PM2 процесса: ${result.stderr}`);
    }
  }

  async pm2Restart(serverId: string, pm2Name: string, scriptPath?: string): Promise<void> {
    const restartCommand = this.buildPm2Command(`restart "${pm2Name}"`);
    const restartResult = await this.executeCommand(serverId, restartCommand);

    if (restartResult.code !== 0) {
      if (scriptPath) {
        await this.pm2Start(serverId, scriptPath, pm2Name);
      } else {
        throw new BadRequestException(`Ошибка перезапуска PM2 процесса: ${restartResult.stderr}`);
      }
    }
  }

  async pm2GetStatus(serverId: string, pm2Name: string): Promise<any> {
    try {
      const pm2Command = this.buildPm2Command('jlist');
      const commandWithJq = `${pm2Command} | jq '.[] | select(.name == "${pm2Name}")'`;
      const resultWithJq = await this.executeCommand(serverId, commandWithJq);

      if (resultWithJq.code === 0 && resultWithJq.stdout) {
        try {
          const parsed = JSON.parse(resultWithJq.stdout);
          return parsed;
        } catch (error) {
          this.logger.warn(`Failed to parse jq output for ${pm2Name}`);
        }
      }
    } catch (error) {
      this.logger.warn(`jq command failed for ${pm2Name}, trying alternative method`);
    }
    try {
      const command = this.buildPm2Command('jlist');
      const result = await this.executeCommand(serverId, command);

      if (result.code !== 0 || !result.stdout) {
        this.logger.warn(`PM2 jlist failed for server ${serverId}`);
        return null;
      }

      const processes = JSON.parse(result.stdout);
      const process = processes.find((p: any) => p.name === pm2Name);

      if (process) {
        return process;
      }

      return null;
    } catch (error) {
      this.logger.error(`Error getting PM2 status for ${pm2Name}: ${error.message}`);
      return null;
    }
  }

  async pm2GetLogs(serverId: string, pm2Name: string, lines: number = 200): Promise<string> {
    const command = this.buildPm2Command(`logs "${pm2Name}" --lines ${lines} --nostream`);
    const result = await this.executeCommand(serverId, command);

    if (result.code !== 0) {
      throw new BadRequestException(`Ошибка получения логов PM2 процесса: ${result.stderr}`);
    }

    return result.stdout;
  }

  async pm2ClearLogs(serverId: string, pm2Name: string): Promise<void> {
    const command = this.buildPm2Command(`flush "${pm2Name}"`);
    const result = await this.executeCommand(serverId, command);

    if (result.code !== 0) {
      throw new BadRequestException(`Ошибка очистки логов PM2 процесса: ${result.stderr}`);
    }
  }

  async pm2GetAllProcesses(serverId: string): Promise<any[]> {
    const command = this.buildPm2Command('jlist');
    const result = await this.executeCommand(serverId, command);

    if (result.code !== 0) {
      throw new BadRequestException(`Ошибка получения списка PM2 процессов: ${result.stderr}`);
    }

    try {
      return JSON.parse(result.stdout);
    } catch (error) {
      return [];
    }
  }

  async pm2Reload(serverId: string, pm2Name: string): Promise<void> {
    const command = this.buildPm2Command(`reload "${pm2Name}"`);
    const result = await this.executeCommand(serverId, command);

    if (result.code !== 0) {
      throw new BadRequestException(`Ошибка перезагрузки PM2 процесса: ${result.stderr}`);
    }
  }

  async pm2Delete(serverId: string, pm2Name: string): Promise<void> {
    const command = this.buildPm2Command(`delete "${pm2Name}"`);
    const result = await this.executeCommand(serverId, command);

    if (result.code !== 0) {
      throw new BadRequestException(`Ошибка удаления PM2 процесса: ${result.stderr}`);
    }
  }

  
  async pm2GetProcessInfo(serverId: string, pm2Name: string): Promise<Pm2ProcessInfo | null> {
    const command = this.buildPm2Command('jlist');
    const result = await this.executeCommand(serverId, command);

    if (result.code !== 0) {
      return null;
    }

    try {
      const processes = JSON.parse(result.stdout);
      const process = processes.find((p: any) => p.name === pm2Name);

      if (!process) {
        return null;
      }

      return {
        pid: process.pid,
        name: process.name,
        status: process.pm2_env.status,
        uptime: process.pm2_env.uptime,
        cpu: process.monit.cpu,
        memory: process.monit.memory,
      };
    } catch (error) {
      this.logger.error('Ошибка парсинга PM2 процессов:', error);
      return null;
    }
  }


  
  async createEcosystemConfig(serverId: string, scriptPath: string, pm2Name: string, scriptFile: string = 'index.js'): Promise<void> {
    const ecosystemConfig = `module.exports = {
  apps: [{
    name: '${pm2Name}',
    script: '${scriptFile}',
    cwd: '${scriptPath}',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    }
  }]
};`;

    const configPath = path.join(scriptPath, 'ecosystem.config.js');
    await this.uploadFile(serverId, ecosystemConfig, configPath);
  }

  
  async testConnection(serverId: string): Promise<boolean> {
    try {
      const result = await this.executeCommand(serverId, 'echo "SSH connection test"');
      return result.code === 0;
    } catch (error) {
      const errorMsg = error.message || 'Connection test failed';
      this.logger.warn(`SSH test failed: ${serverId} - ${errorMsg}`, {
        serverId,
      });
      return false;
    }
  }

  
  async testSimpleConnection(serverId: string): Promise<{ success: boolean; error?: string }> {
    const server = await this.prisma.server.findUnique({
      where: { id: serverId },
      include: { key: true },
    });

    if (!server) {
      return { success: false, error: 'Сервер не найден' };
    }

    if (!server.isActive) {
      return { success: false, error: 'Сервер неактивен' };
    }
    const privateKey = await this.decryptPrivateKey(server.key.privateKeyEncrypted);
    if (!this.isValidPrivateKey(privateKey)) {
      return { success: false, error: 'Неверный формат приватного ключа' };
    }
    const ssh = new NodeSSH();

    try {
      await ssh.connect({
        host: server.host,
        port: server.port,
        username: server.sshUser,
        privateKey,
        readyTimeout: 10000,
      });
      const result = await ssh.execCommand('echo "test"');
      ssh.dispose();

      if (result.code === 0) {
        return { success: true };
      } else {
        const errorMsg = result.stderr || `Exit code ${result.code}`;
        this.logger.warn(`SSH test failed: ${server.host} - ${errorMsg}`, {
          serverId: server.id,
          exitCode: result.code,
        });
        return { success: false, error: errorMsg };
      }
    } catch (error) {
      ssh.dispose();
      const errorMsg = error.message || 'Connection failed';
      this.logger.warn(`SSH test failed: ${server.host} - ${errorMsg}`, {
        serverId: server.id,
      });
      return { success: false, error: errorMsg };
    }
  }

  
  async closeConnection(serverId: string): Promise<void> {
    const ssh = this.sshConnections.get(serverId);
    if (ssh) {
      ssh.dispose();
      this.sshConnections.delete(serverId);
    }
  }

  
  async closeAllConnections(): Promise<void> {
    for (const [serverId, ssh] of this.sshConnections) {
      ssh.dispose();
    }
    this.sshConnections.clear();
  }

  
  private async decryptPrivateKey(encryptedKey: string): Promise<string> {
    try {
      return Buffer.from(encryptedKey, 'base64').toString('utf-8');
    } catch (error) {
      this.logger.error('Ошибка расшифровки приватного ключа:', error);
      throw new BadRequestException('Ошибка расшифровки приватного ключа');
    }
  }

  
  private isValidPrivateKey(privateKey: string): boolean {
    if (!privateKey || typeof privateKey !== 'string') {
      return false;
    }
    const validHeaders = [
      '-----BEGIN OPENSSH PRIVATE KEY-----',
      '-----BEGIN RSA PRIVATE KEY-----',
      '-----BEGIN PRIVATE KEY-----',
      '-----BEGIN EC PRIVATE KEY-----',
      '-----BEGIN DSA PRIVATE KEY-----'
    ];

    return validHeaders.some(header => privateKey.includes(header));
  }

  
  async encryptPrivateKey(privateKey: string): Promise<string> {
    if (!this.isValidPrivateKey(privateKey)) {
      throw new BadRequestException('Неверный формат приватного ключа');
    }
    return Buffer.from(privateKey, 'utf-8').toString('base64');
  }

  
  async getServerStats(serverId: string) {
    try {
      const [cpuResult, memoryResult, diskResult, uptimeResult, loadResult] = await Promise.all([
        this.executeCommand(serverId, "top -bn1 | grep 'Cpu(s)' | awk '{print $2}' | awk -F'%' '{print $1}'"),
        this.executeCommand(serverId, "free | grep Mem | awk '{printf \"%.1f\", $3/$2 * 100.0}'"),
        this.executeCommand(serverId, "df -h / | awk 'NR==2{print $5}' | sed 's/%//'"),
        this.executeCommand(serverId, "uptime -s"),
        this.executeCommand(serverId, "uptime | awk -F'load average:' '{print $2}' | awk '{print $1,$2,$3}' | sed 's/,//g'"),
      ]);
      const cpuUsage = parseFloat(cpuResult.stdout.trim()) || 0;
      const memoryUsage = parseFloat(memoryResult.stdout.trim()) || 0;
      const diskUsage = parseFloat(diskResult.stdout.trim()) || 0;
      const uptimeStart = new Date(uptimeResult.stdout.trim());
      const uptime = Math.floor((Date.now() - uptimeStart.getTime()) / 1000);
      const loadParts = loadResult.stdout.trim().split(' ');
      const loadAverage = [
        parseFloat(loadParts[0]) || 0,
        parseFloat(loadParts[1]) || 0,
        parseFloat(loadParts[2]) || 0,
      ];
      const networkResult = await this.executeCommand(serverId, "cat /proc/net/dev | grep -E 'eth0|ens|enp' | head -1 | awk '{print $2,$10}'");
      const networkParts = networkResult.stdout.trim().split(' ');
      const networkIn = parseInt(networkParts[0]) || 0;
      const networkOut = parseInt(networkParts[1]) || 0;

      return {
        status: 'online',
        cpuUsage,
        memoryUsage,
        diskUsage,
        networkIn,
        networkOut,
        uptime,
        loadAverage,
      };
    } catch (error) {
      const errorMsg = error.message || 'Unknown error';
      this.logger.warn(`Server stats failed: ${serverId} - ${errorMsg}`, {
        serverId,
        error: errorMsg,
      });

      return {
        status: 'offline',
        cpuUsage: 0,
        memoryUsage: 0,
        diskUsage: 0,
        networkIn: 0,
        networkOut: 0,
        uptime: 0,
        loadAverage: [0, 0, 0],
      };
    }
  }

  
  async listFiles(serverId: string, remotePath: string = '/'): Promise<any[]> {
    const ssh = await this.getSshConnection(serverId);

    try {
      const result = await this.executeCommand(serverId, `ls -la "${remotePath}"`);

      if (result.code !== 0) {
        throw new BadRequestException(`Ошибка получения списка файлов: ${result.stderr}`);
      }

      const lines = result.stdout.split('\n').filter(line => line.trim());
      const files: any[] = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const parts = line.trim().split(/\s+/);

        if (parts.length < 9) continue;

        const permissions = parts[0];
        const links = parseInt(parts[1]) || 0;
        const owner = parts[2];
        const group = parts[3];
        const size = parseInt(parts[4]) || 0;
        const month = parts[5];
        const day = parts[6];
        const timeOrYear = parts[7];
        const name = parts.slice(8).join(' ');
        if (name === '.' || name === '..') continue;

        const isDirectory = permissions.startsWith('d');
        const isLink = permissions.startsWith('l');
        let fullPath: string;
        if (remotePath === '/') {
          fullPath = `/${name}`;
        } else if (remotePath.endsWith('/')) {
          fullPath = `${remotePath}${name}`;
        } else {
          fullPath = `${remotePath}/${name}`;
        }

        files.push({
          name,
          path: fullPath,
          type: isDirectory ? 'directory' : isLink ? 'link' : 'file',
          size,
          permissions,
          owner,
          group,
          modified: `${month} ${day} ${timeOrYear}`,
        });
      }
      files.sort((a, b) => {
        if (a.type === 'directory' && b.type !== 'directory') return -1;
        if (a.type !== 'directory' && b.type === 'directory') return 1;
        return a.name.localeCompare(b.name);
      });

      return files;
    } catch (error) {
      this.logger.error(`Ошибка получения списка файлов:`, error);
      throw new BadRequestException(`Ошибка получения списка файлов: ${error.message}`);
    }
  }

  
  async deleteFile(serverId: string, remotePath: string): Promise<void> {
    try {
      const checkResult = await this.executeCommand(serverId, `test -d "${remotePath}" && echo "dir" || echo "file"`);

      if (checkResult.code !== 0) {
        throw new BadRequestException(`Файл или директория не найдены: ${remotePath}`);
      }

      const isDirectory = checkResult.stdout.trim() === 'dir';
      const command = isDirectory ? `rm -rf "${remotePath}"` : `rm -f "${remotePath}"`;

      const result = await this.executeCommand(serverId, command);

      if (result.code !== 0) {
        throw new BadRequestException(`Ошибка удаления: ${result.stderr}`);
      }
    } catch (error) {
      this.logger.error(`Ошибка удаления файла:`, error);
      throw new BadRequestException(`Ошибка удаления файла: ${error.message}`);
    }
  }


  
  async uploadFileFromBuffer(serverId: string, buffer: Buffer, remotePath: string): Promise<void> {
    const ssh = await this.getSshConnection(serverId);

    try {
      const tempPath = path.join(require('os').tmpdir(), `upload_${Date.now()}_${Math.random().toString(36).substring(7)}`);
      await fs.writeFile(tempPath, buffer);

      try {
        await ssh.putFile(tempPath, remotePath);
      } finally {
        await fs.unlink(tempPath).catch(() => {});
      }
    } catch (error) {
      this.logger.error(`Ошибка загрузки файла:`, error);
      throw new BadRequestException(`Ошибка загрузки файла: ${error.message}`);
    }
  }

  
  async downloadFileToBuffer(serverId: string, remotePath: string): Promise<Buffer> {
    const ssh = await this.getSshConnection(serverId);

    try {
      const tempPath = path.join(require('os').tmpdir(), `download_${Date.now()}_${Math.random().toString(36).substring(7)}`);

      try {
        await ssh.getFile(tempPath, remotePath);
        const buffer = await fs.readFile(tempPath);
        return buffer;
      } finally {
        await fs.unlink(tempPath).catch(() => {});
      }
    } catch (error) {
      this.logger.error(`Ошибка скачивания файла:`, error);
      throw new BadRequestException(`Ошибка скачивания файла: ${error.message}`);
    }
  }
}
