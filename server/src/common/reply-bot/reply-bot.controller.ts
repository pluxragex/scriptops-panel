import { Controller, Post, Body, Query, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ReplyBotService } from './reply-bot.service';
import { Public } from '../../auth/decorators/public.decorator';
import { ScriptsService } from '../../scripts/scripts.service';

@ApiTags('Reply Bot')
@Controller('reply-bot')
export class ReplyBotController {
  constructor(
    private readonly replyBotService: ReplyBotService,
    private readonly scriptsService: ScriptsService,
  ) {}

  @Post('forward-message')
  @Public()
  @ApiOperation({ summary: 'Уведомление reply-бота о новом сообщении для пересылки (для weekly_bot)' })
  @ApiResponse({ status: 200, description: 'Сообщение обработано' })
  @ApiResponse({ status: 401, description: 'Неверный API ключ' })
  async forwardMessage(
    @Body() body: {
      scriptId: string;
      channelId: string;
      messageId: string;
      forwardTo: string;
      message: {
        content?: string;
        embeds?: any[];
        author?: any;
      };
    },
    @Query('apiKey') apiKey: string,
  ) {

    if (!apiKey) {
      throw new UnauthorizedException('API ключ не предоставлен');
    }

    await this.scriptsService.validateApiKey(body.scriptId, apiKey);

    return this.replyBotService.forwardMessageFromApi(
      body.scriptId,
      body.channelId,
      body.messageId,
      body.forwardTo,
      body.message,
    );
  }

  @Post('registration-sent')
  @Public()
  @ApiOperation({ summary: 'Уведомление reply-бота об отправке регистрации (для weekly_bot)' })
  @ApiResponse({ status: 200, description: 'Сообщение обновлено' })
  @ApiResponse({ status: 401, description: 'Неверный API ключ' })
  async registrationSent(
    @Body() body: {
      scriptId: string;
      originalMessageId: string;
      forwardToChannelId: string;
    },
    @Query('apiKey') apiKey: string,
  ) {

    if (!apiKey) {
      throw new UnauthorizedException('API ключ не предоставлен');
    }

    await this.scriptsService.validateApiKey(body.scriptId, apiKey);

    return this.replyBotService.updateMessageAfterRegistrationSent(
      body.scriptId,
      body.originalMessageId,
      body.forwardToChannelId,
    );
  }
}

