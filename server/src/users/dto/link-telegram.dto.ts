import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class LinkTelegramDto {
  @ApiProperty({
    description: 'Telegram User ID',
    example: 123456789,
  })
  @IsNumber()
  @IsNotEmpty()
  id: number;

  @ApiProperty({
    description: 'Имя пользователя в Telegram',
    example: 'Иван',
  })
  @IsString()
  @IsNotEmpty()
  first_name: string;

  @ApiProperty({
    description: 'Фамилия пользователя в Telegram',
    example: 'Иванов',
    required: false,
  })
  @IsString()
  @IsOptional()
  last_name?: string;

  @ApiProperty({
    description: 'Username в Telegram',
    example: 'username',
    required: false,
  })
  @IsString()
  @IsOptional()
  username?: string;

  @ApiProperty({
    description: 'Фото профиля URL',
    example: 'https://t.me/i/userpic/...',
    required: false,
  })
  @IsString()
  @IsOptional()
  photo_url?: string;

  @ApiProperty({
    description: 'Хеш для проверки подлинности данных от Telegram',
    example: 'abc123...',
  })
  @IsString()
  @IsNotEmpty()
  hash: string;

  @ApiProperty({
    description: 'Время авторизации',
    example: 1234567890,
  })
  @IsNumber()
  @IsNotEmpty()
  auth_date: number;
}

