import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class RevokeSessionDto {
  @ApiProperty({
    description: 'ID сессии (предпочтительно)',
    example: 'clx0d0d0d0d0d0d0d0d0d0d0d',
    required: false,
  })
  @IsString({ message: 'ID сессии должен быть строкой' })
  @IsOptional()
  sessionId?: string;

  @ApiProperty({
    description: 'Хеш токена сессии (альтернатива sessionId)',
    example: 'abc123...',
    required: false,
  })
  @IsString({ message: 'Хеш токена должен быть строкой' })
  @IsOptional()
  tokenHash?: string;

  @ApiProperty({
    description: 'ID пользователя',
    example: 'user123',
  })
  @IsString({ message: 'ID пользователя должен быть строкой' })
  @IsNotEmpty({ message: 'ID пользователя обязателен' })
  userId: string;

  @ApiProperty({
    description: 'Секретный ключ бота для безопасности',
    example: 'your_bot_secret',
  })
  @IsString({ message: 'Секретный ключ должен быть строкой' })
  @IsNotEmpty({ message: 'Секретный ключ обязателен' })
  secret: string;
}

