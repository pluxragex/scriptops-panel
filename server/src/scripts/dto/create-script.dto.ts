import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MinLength, MaxLength, IsOptional, IsEnum } from 'class-validator';

export class CreateScriptDto {
  @ApiProperty({
    description: 'Название скрипта',
    example: 'My Discord Bot',
    minLength: 3,
    maxLength: 100,
  })
  @IsString({ message: 'Название должно быть строкой' })
  @IsNotEmpty({ message: 'Название не может быть пустым' })
  @MinLength(3, { message: 'Название должно содержать минимум 3 символа' })
  @MaxLength(100, { message: 'Название должно содержать максимум 100 символов' })
  name: string;

  @ApiProperty({
    description: 'Описание скрипта',
    example: 'Discord бот для управления сервером',
    required: false,
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: 'Описание должно быть строкой' })
  @MaxLength(500, { message: 'Описание должно содержать максимум 500 символов' })
  description?: string;

  @ApiProperty({
    description: 'Тип скрипта',
    example: 'CYBER_LEAGUE',
    enum: ['CUSTOM', 'CYBER_LEAGUE', 'WEEKLY_CUP', 'ALLIANCE_BOT'],
  })
  @IsEnum(['CUSTOM', 'CYBER_LEAGUE', 'WEEKLY_CUP', 'ALLIANCE_BOT'], { message: 'Тип скрипта должен быть одним из: CUSTOM, CYBER_LEAGUE, WEEKLY_CUP, ALLIANCE_BOT' })
  @IsNotEmpty({ message: 'Тип скрипта не может быть пустым' })
  type: string;

  @ApiProperty({
    description: 'ID сервера для размещения скрипта',
    example: 'server-123',
  })
  @IsString({ message: 'ID сервера должен быть строкой' })
  @IsNotEmpty({ message: 'ID сервера не может быть пустым' })
  serverId: string;

  @ApiProperty({
    description: 'ID владельца скрипта',
    example: 'user-123',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'ID владельца должен быть строкой' })
  ownerId?: string;

  @ApiProperty({
    description: 'Включить автоматическое обновление из шаблона',
    example: false,
    required: false,
    default: false,
  })
  @IsOptional()
  autoUpdate?: boolean;
}
