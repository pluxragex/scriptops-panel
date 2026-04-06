import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { SshService } from '../../ssh/ssh.service';
import * as WebSocket from 'ws';

interface NewsChannelConfig {
  scriptId: string;
  channelId: string;
  forwardTo: string;
  serverName: string;
  lastMessageId: string | null;
}

interface PendingRegistration {
  scriptId: string;
  targetChannelId: string;
  message: string;
  originalChannelId: string;
  originalMessageId: string;
  createdAt: number;
}


const CHANNEL_IMAGES: Record<string, string> = {
  '1367922911289151529': 'https://i.ibb.co/678jDM6d/1.jpg',
  '738118962168201248': 'https://i.ibb.co/RTmt0nhs/2.jpg',
  '738118974386208880': 'https://i.ibb.co/HDKRsVQL/3.jpg',
  '738118982581616671': 'https://i.ibb.co/3Ym6vqPW/4.jpg',
  '738118990383284234': 'https://i.ibb.co/zhFH4Njj/5.jpg',
  '905563151318274089': 'https://i.ibb.co/wrQhJr6D/6.jpg',
  '916112805906763786': 'https://i.ibb.co/wrQhJr6D/6.jpg',
  '1056386679671357501': 'https://i.ibb.co/VYBc9ZSd/8.jpg',
  '1284836808789594163': 'https://i.ibb.co/WqyMDbx/9.jpg',
  '1181219262313017344': 'https://i.ibb.co/QFHvLFbS/10.jpg',
  '1214710371403964466': 'https://i.ibb.co/gnfCHmq/11.jpg',
  '1248624620991549440': 'https://i.ibb.co/kVywh9P5/12.jpg',
  '1273355399160135733': 'https://i.ibb.co/6Rd8cZpc/13.jpg',
  '1316481413423435889': 'https://i.ibb.co/PvhJLHNR/14.jpg',
  '1333884807926779997': 'https://i.ibb.co/6cJQLC56/15.jpg',
  '1381703567953629326': 'https://i.ibb.co/5gGCZgVs/16.jpg',
  '1429823260962455633': 'https://i.ibb.co/C5nMdB7F/17.jpg',
};

@Injectable()
export class ReplyBotService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ReplyBotService.name);
  private replyBotToken: string;
  private ws: WebSocket | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private sequence: number | null = null;
  private sessionId: string | null = null;


  private newsChannels: Map<string, NewsChannelConfig> = new Map();


  private pendingRegistrations: Map<string, PendingRegistration> = new Map();
  private monitoringChannels: Set<string> = new Set();

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private sshService: SshService,
  ) {
    this.replyBotToken = this.configService.get<string>('REPLY_TOKEN_BOT') || '';
  }

  async onModuleInit() {
    if (!this.replyBotToken) {
      this.logger.warn('REPLY_TOKEN_BOT не установлен, reply-бот не будет запущен');
      return;
    }

    await this.loadNewsChannels();
    await this.connectToGateway();


    setInterval(() => {
      this.loadNewsChannels();
    }, 30000);
  }

  async onModuleDestroy() {
    if (this.ws) {
      this.ws.close();
    }
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
  }


  private async loadNewsChannels() {
    try {
      const scripts = await this.prisma.script.findMany({
        where: { type: 'WEEKLY_CUP' },
        include: { server: true },
      });

      const newChannels = new Map<string, NewsChannelConfig>();

      for (const script of scripts) {

        try {
          const envContent = await this.sshService.readEnvFile(script.serverId, script.pathOnServer);
          const channels = this.parseEnvChannels(envContent, script.id);

          for (const channel of channels) {
            const key = `${script.id}_${channel.channelId}`;
            newChannels.set(key, {
              scriptId: script.id,
              channelId: channel.channelId,
              forwardTo: channel.forwardTo,
              serverName: channel.serverName,
              lastMessageId: this.newsChannels.get(key)?.lastMessageId || null,
            });
          }
        } catch (error) {

          this.logger.debug(`Не удалось загрузить каналы для скрипта ${script.id}: ${error}`);
        }
      }

      this.newsChannels = newChannels;
    } catch (error) {
      this.logger.error('Ошибка загрузки каналов:', error);
    }
  }


  private parseEnvChannels(envContent: string, scriptId: string): Array<{channelId: string, forwardTo: string, serverName: string}> {
    const channels: Array<{channelId: string, forwardTo: string, serverName: string}> = [];
    const lines = envContent.split('\n');

    let channelCount = 0;
    for (const line of lines) {
      if (line.trim().startsWith('CHANNELS_COUNT=')) {
        channelCount = parseInt(line.split('=')[1]) || 0;
        break;
      }
    }

    for (let i = 1; i <= channelCount; i++) {
      const channelId = this.getEnvValue(lines, `CHANNEL_${i}_ID`);
      const forwardTo = this.getEnvValue(lines, `CHANNEL_${i}_FORWARD_TO`);
      const serverName = this.getEnvValue(lines, `CHANNEL_${i}_SERVER_NAME`) || `Channel ${i}`;

      if (channelId && forwardTo) {
        channels.push({ channelId, forwardTo, serverName });
      }
    }

    return channels;
  }

  private getEnvValue(lines: string[], key: string): string {
    for (const line of lines) {
      if (line.trim().startsWith(`${key}=`)) {
        return line.split('=')[1] || '';
      }
    }
    return '';
  }


  private async connectToGateway() {
    try {
      const result = await this.botRequest('/gateway/bot');
      if (!result.ok) {
        this.logger.error('Ошибка получения Gateway URL:', result.data);
        return;
      }

      const gatewayUrl = result.data.url;
      const wsUrl = `${gatewayUrl}?v=10&encoding=json`;

      this.ws = new WebSocket(wsUrl);

      this.ws.on('open', () => {

      });

      this.ws.on('message', (data: WebSocket.Data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleGatewayMessage(message);
        } catch (error) {
          this.logger.error('Ошибка парсинга сообщения Gateway:', error);
        }
      });

      this.ws.on('error', (error) => {
        this.logger.error('Ошибка WebSocket:', error);
      });

      this.ws.on('close', (code, reason) => {
        if (this.heartbeatInterval) {
          clearInterval(this.heartbeatInterval);
          this.heartbeatInterval = null;
        }

        if (code !== 1000) {
          setTimeout(() => {
            this.connectToGateway();
          }, 5000);
        }
      });
    } catch (error) {
      this.logger.error('Критическая ошибка при подключении к Gateway:', error);
    }
  }


  private async botRequest(endpoint: string, options: any = {}) {
    const url = `https://discord.com/api/v10${endpoint}`;
    const headers = {
      'Authorization': `Bot ${this.replyBotToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        await new Promise(resolve => setTimeout(resolve, parseInt(retryAfter || '5') * 1000));
        return this.botRequest(endpoint, options);
      }

      const data = await response.json().catch(() => ({}));
      return { ok: response.ok, status: response.status, data };
    } catch (error) {
      this.logger.error(`Ошибка запроса к Discord API: ${error}`);
      return { ok: false, error };
    }
  }


  private handleGatewayMessage(message: any) {
    const { op, d, s, t } = message;

    if (s) this.sequence = s;

    switch (op) {
      case 10:
        const { heartbeat_interval } = d;
        this.startHeartbeat(heartbeat_interval);
        this.identify();
        break;

      case 11:
        break;

      case 0:
        this.handleDispatchEvent(t, d);
        break;

      case 7:
        this.ws?.close();
        break;

      case 9:
        setTimeout(() => {
          this.identify();
        }, 1000);
        break;
    }
  }

  private startHeartbeat(interval: number) {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      this.sendGatewayMessage({
        op: 1,
        d: this.sequence,
      });
    }, interval);
  }

  private identify() {
    this.sendGatewayMessage({
      op: 2,
      d: {
        token: this.replyBotToken,
        intents: 513,
        properties: {
          $os: process.platform,
          $browser: 'reply-bot-service',
          $device: 'reply-bot-service',
        },
      },
    });
  }

  private sendGatewayMessage(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  private handleDispatchEvent(eventType: string, data: any) {
    switch (eventType) {
      case 'READY':
        this.sessionId = data.session_id;
        break;

      case 'MESSAGE_CREATE':
        this.handleMessageCreate(data);
        break;

      case 'INTERACTION_CREATE':
        this.handleInteraction(data);
        break;
    }
  }


  private async handleMessageCreate(message: any) {

    for (const [key, config] of this.newsChannels.entries()) {
      if (config.channelId === message.channel_id) {

        if (message.author && message.author.bot) return;


        this.logger.debug(`Сообщение ${message.id} в канале ${message.channel_id} получено через Gateway, но пропускается (обработка через weekly_bot API)`);
        return;
      }
    }
  }


  async forwardMessageFromApi(
    scriptId: string,
    channelId: string,
    messageId: string,
    forwardTo: string,
    messageData: { content?: string; embeds?: any[]; author?: any },
  ) {

    const key = `${scriptId}_${channelId}`;
    const config = this.newsChannels.get(key);

    if (config && config.lastMessageId === messageId) {
      this.logger.debug(`Сообщение ${messageId} уже было обработано`);
      return { success: false, reason: 'already_processed' };
    }


    if (config) {
      config.lastMessageId = messageId;
    }


    const messageObj = {
      id: messageId,
      channel_id: channelId,
      content: messageData.content || '',
      embeds: messageData.embeds || [],
      author: messageData.author,
    };

    await this.forwardMessage(messageObj, forwardTo, scriptId);
    return { success: true };
  }


  private async forwardMessage(originalMessage: any, targetChannelId: string, scriptId: string) {
    try {
      let content = '';
      if (originalMessage.content) {
        content = originalMessage.content;
      }


      const hasEmbeds = originalMessage.embeds && originalMessage.embeds.length > 0;


      const existingRegistration = await this.getRegistrationForMessage(scriptId, originalMessage.id);

      const payload: any = {};


      const registrationFooter = `\n\n**Пример заполненной регистрации:**\n\`\`\`\n222 \n@730411501860421685 7248\n@1110253761215086642 123123\nda\nimage url\n\nВажно: Используйте сочетание символа @ и Discord ID пользователя для корректных упоминаний.\`\`\``;


      if (existingRegistration) {

        let registrationInfo = `\n**Текущие данные регистрации:**\n\n**ID канала:** <#${existingRegistration.targetChannelId}>\n**Текст:**\n\`\`\`\n${existingRegistration.message}\n\`\`\``;


        if (content.trim()) {
          payload.content = content + registrationFooter + registrationInfo;
        } else if (hasEmbeds) {
          payload.content = registrationFooter + registrationInfo;
        } else {
          payload.content = registrationFooter + registrationInfo;
        }
      } else {

        if (content.trim()) {
          payload.content = content + registrationFooter;
        } else if (hasEmbeds) {
          payload.content = registrationFooter;
        } else {
          payload.content = registrationFooter;
        }
      }


      const embeds = originalMessage.embeds ? [...originalMessage.embeds] : [];


      const channelImageUrl = CHANNEL_IMAGES[originalMessage.channel_id];
      if (channelImageUrl) {

        embeds.push({
          image: {
            url: channelImageUrl,
          },
        });
      }

      if (embeds.length > 0) {
        payload.embeds = embeds;
      }


      const components = [{
        type: 1,
        components: [{
          type: 2,
          style: existingRegistration ? 2 : 1,
          label: existingRegistration ? 'Изменить форму регистрации' : 'Отправить регистрацию',
          custom_id: `register_${scriptId}_${originalMessage.id}`,
        }],
      }];

      payload.components = components;

      const result = await this.botRequest(`/channels/${targetChannelId}/messages`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (!result.ok) {
        this.logger.error(`Ошибка отправки сообщения:`, result.data);
      }
    } catch (error) {
      this.logger.error(`Ошибка при пересылке сообщения:`, error);
    }
  }


  private async handleInteraction(interaction: any) {
    const { type, data, id, token } = interaction;

    if (type === 3) {
      if (data.custom_id && data.custom_id.startsWith('register_')) {
        await this.showRegistrationModal(interaction);
      }
    } else if (type === 5) {
      await this.handleModalSubmit(interaction);
    }
  }


  private async showRegistrationModal(interaction: any) {
    const { id, token } = interaction;
    const scriptId = interaction.data.custom_id.split('_')[1];
    const messageId = interaction.data.custom_id.split('_').slice(2).join('_');


    const existingRegistration = await this.getRegistrationForMessage(scriptId, messageId);

    const modal = {
      type: 9,
      data: {
        title: existingRegistration ? 'Изменить форму регистрации' : 'Отправить регистрацию',
        custom_id: `register_modal_${scriptId}_${messageId}`,
        components: [
          {
            type: 1,
            components: [{
              type: 4,
              custom_id: 'target_channel_id',
              label: 'ID канала для регистрации',
              style: 1,
              placeholder: '123456789012345678',
              value: existingRegistration ? existingRegistration.targetChannelId : undefined,
              required: true,
              min_length: 17,
              max_length: 20,
            }],
          },
          {
            type: 1,
            components: [{
              type: 4,
              custom_id: 'registration_message',
              label: 'Сообщение для регистрации',
              style: 2,
              placeholder: 'Введите текст сообщения...',
              value: existingRegistration ? existingRegistration.message.substring(0, 4000) : undefined,
              required: true,
              min_length: 1,
              max_length: 2000,
            }],
          },
        ],
      },
    };

    await this.botRequest(`/interactions/${id}/${token}/callback`, {
      method: 'POST',
      body: JSON.stringify(modal),
    });
  }


  private async handleModalSubmit(interaction: any) {
    const { id, token, data } = interaction;
    const { custom_id, components } = data;

    const parts = custom_id.replace('register_modal_', '').split('_');
    const scriptId = parts[0];
    const originalMessageId = parts.slice(1).join('_');

    const targetChannelId = components[0].components[0].value;
    const registrationMessage = components[1].components[0].value;


    const existing = await this.getRegistrationForMessage(scriptId, originalMessageId);
    const isUpdate = !!existing;


    await this.notifySelfBot(scriptId, targetChannelId, registrationMessage, interaction.channel_id, originalMessageId);


    await this.botRequest(`/interactions/${id}/${token}/callback`, {
      method: 'POST',
      body: JSON.stringify({
        type: 4,
        data: {
          content: isUpdate
            ? `Форма регистрации обновлена! Self-бот будет мониторить канал <#${targetChannelId}> и отправит обновленное сообщение при открытии доступа`
            : `Регистрация настроена! Self-бот будет мониторить канал <#${targetChannelId}> и отправит сообщение при открытии доступа.`,
          flags: 64,
        },
      }),
    });


    if (interaction.message && interaction.message.id) {
      try {

        let originalContent = interaction.message.content || '';

        const exampleIndex = originalContent.indexOf('**Пример заполненной регистрации:**');
        if (exampleIndex !== -1) {

          const lineStart = originalContent.lastIndexOf('\n\n', exampleIndex - 1);
          originalContent = originalContent.substring(0, lineStart !== -1 ? lineStart : exampleIndex);
        } else {
          const registrationInfoIndex = originalContent.indexOf('\n**Текущие данные регистрации:**');
          if (registrationInfoIndex !== -1) {
            originalContent = originalContent.substring(0, registrationInfoIndex);
          }
        }


        const registrationFooter = `\n\n**Пример заполненной регистрации:**\n\`\`\`\n222 \n@730411501860421685 7248\n@1110253761215086642 123123\nda\nimage url\n\nВажно: Используйте сочетание символа @ и Discord ID пользователя для корректных упоминаний.\`\`\``;


        const registrationInfo = `\n**Текущие данные регистрации:**\n\n**ID канала:** <#${targetChannelId}>\n**Текст:**\n\`\`\`\n${registrationMessage}\n\`\`\``;
        const updatedContent = originalContent + registrationFooter + registrationInfo;


        await this.botRequest(`/channels/${interaction.channel_id}/messages/${interaction.message.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            content: updatedContent,
            embeds: interaction.message.embeds || [],
            components: [{
              type: 1,
              components: [{
                type: 2,
                style: 2,
                label: 'Изменить форму регистрации',
                custom_id: `register_${scriptId}_${originalMessageId}`,
              }],
            }],
          }),
        });
      } catch (error) {
        this.logger.error(`Ошибка обновления сообщения:`, error);
      }
    }
  }


  private async getRegistrationsFilePath(scriptId: string): Promise<string> {
    const script = await this.prisma.script.findUnique({
      where: { id: scriptId },
      include: { server: true },
    });

    if (!script) {
      throw new Error(`Скрипт ${scriptId} не найден`);
    }


    return `${script.pathOnServer}/registrations.json`;
  }


  private async getRegistrationForMessage(scriptId: string, originalMessageId: string) {
    try {
      const filePath = await this.getRegistrationsFilePath(scriptId);
      const script = await this.prisma.script.findUnique({
        where: { id: scriptId },
      });

      if (!script) {
        return null;
      }

      const registrations = await this.sshService.readJsonFile(script.serverId, filePath);
      const registration = registrations.find(
        (reg: any) => reg.originalMessageId === originalMessageId
      );

      if (registration) {
        return {
          id: registration.id,
          targetChannelId: registration.targetChannelId,
          message: registration.message,
        };
      }
      return null;
    } catch (error) {
      this.logger.error(`Ошибка получения регистрации для сообщения:`, error);
      return null;
    }
  }


  private async notifySelfBot(scriptId: string, targetChannelId: string, message: string, forwardToChannelId?: string, originalMessageId?: string, originalChannelId?: string) {
    try {
      const filePath = await this.getRegistrationsFilePath(scriptId);
      const script = await this.prisma.script.findUnique({
        where: { id: scriptId },
      });

      if (!script) {
        throw new Error(`Скрипт ${scriptId} не найден`);
      }


      let registrations = await this.sshService.readJsonFile(script.serverId, filePath);
      if (!Array.isArray(registrations)) {
        registrations = [];
      }


      const existingIndex = registrations.findIndex(
        (reg: any) => reg.originalMessageId === originalMessageId
      );

      if (existingIndex !== -1) {

        registrations[existingIndex] = {
          id: registrations[existingIndex].id,
          targetChannelId: targetChannelId.trim(),
          message: message.trim(),
          originalChannelId: originalChannelId || null,
          originalMessageId: originalMessageId || null,
          forwardToChannelId: forwardToChannelId || null,
        };
      } else {

        const id = `reg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        registrations.push({
          id,
          targetChannelId: targetChannelId.trim(),
          message: message.trim(),
          originalChannelId: originalChannelId || null,
          originalMessageId: originalMessageId || null,
          forwardToChannelId: forwardToChannelId || null,
        });
      }


      await this.sshService.writeJsonFile(script.serverId, filePath, registrations);
    } catch (error) {
      this.logger.error(`Ошибка сохранения регистрации в локальный файл:`, error);
    }
  }


  async updateMessageAfterRegistrationSent(scriptId: string, originalMessageId: string, forwardToChannelId: string) {
    try {


      const messagesResult = await this.botRequest(`/channels/${forwardToChannelId}/messages?limit=50`);

      if (!messagesResult.ok || !Array.isArray(messagesResult.data)) {
        this.logger.warn(`Не удалось получить сообщения из канала ${forwardToChannelId}`);
        return;
      }


      let messageToUpdate = null;
      const expectedCustomId = `register_${scriptId}_${originalMessageId}`;

      for (const msg of messagesResult.data) {
        if (msg.components && Array.isArray(msg.components)) {
          for (const component of msg.components) {
            if (component.components && Array.isArray(component.components)) {
              for (const button of component.components) {
                if (button.custom_id === expectedCustomId) {
                  messageToUpdate = msg;
                  break;
                }
              }
            }
            if (messageToUpdate) break;
          }
        }
        if (messageToUpdate) break;
      }

      if (!messageToUpdate) {
        this.logger.warn(`Не найдено сообщение для обновления: originalMessageId=${originalMessageId}, forwardToChannelId=${forwardToChannelId}`);
        return;
      }


      let originalContent = messageToUpdate.content || '';


      const exampleIndex = originalContent.indexOf('**Пример заполненной регистрации:**');
      if (exampleIndex !== -1) {

        const lineStart = originalContent.lastIndexOf('\n\n', exampleIndex - 1);
        originalContent = originalContent.substring(0, lineStart !== -1 ? lineStart : exampleIndex).trim();
      } else {

        const registrationInfoPatterns = [
          '\n**Текущие данные регистрации:**',
          '\n**Текущие данные:**',
          '**Текущие данные регистрации:**',
          '**Текущие данные:**',
          'Текущие данные регистрации:',
          'Текущие данные:',
        ];

        let registrationInfoIndex = -1;
        for (const pattern of registrationInfoPatterns) {
          const index = originalContent.indexOf(pattern);
          if (index !== -1) {
            registrationInfoIndex = index;
            break;
          }
        }

        if (registrationInfoIndex !== -1) {
          originalContent = originalContent.substring(0, registrationInfoIndex).trim();
        } else {
          this.logger.warn(`Паттерн регистрации не найден в сообщении, используем весь контент`);
        }
      }


      const updatedContent = originalContent + (originalContent ? '\n\n' : '') + '**Сообщение было отправлено**';


      const updateResult = await this.botRequest(`/channels/${forwardToChannelId}/messages/${messageToUpdate.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          content: updatedContent,
          embeds: messageToUpdate.embeds || [],
          components: [],
        }),
      });

      if (!updateResult.ok) {
        this.logger.error(`Ошибка обновления сообщения:`, updateResult.data);
      }
    } catch (error) {
      this.logger.error(`Ошибка обновления сообщения после отправки регистрации:`, error);
    }
  }
}

