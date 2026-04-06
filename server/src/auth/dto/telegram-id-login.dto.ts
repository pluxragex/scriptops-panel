import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsNotEmpty, IsString } from 'class-validator';

export class TelegramIdLoginDto {
  @ApiProperty({
    description: 'Telegram User ID',
    example: 123456789,
  })
  @IsNumber()
  @IsNotEmpty()
  telegramUserId: number;

  @ApiProperty({
    description: 'Секретный ключ бота для авторизации',
    example: 'bot_secret_key',
  })
  @IsString()
  @IsNotEmpty()
  botSecret?: string;
}

