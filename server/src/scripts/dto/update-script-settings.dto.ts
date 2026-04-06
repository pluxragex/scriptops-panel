import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsObject } from 'class-validator';

export class UpdateScriptSettingsDto {
  @ApiProperty({
    description: 'Токен Discord бота',
    example: 'your_discord_bot_token',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Токен бота должен быть строкой' })
  botToken?: string;

  @ApiProperty({
    description: 'Настройки для Cyber League бота',
    required: false,
  })
  @IsOptional()
  @IsObject({ message: 'Настройки Cyber League должны быть объектом' })
  cyberLeagueSettings?: any;

  @ApiProperty({
    description: 'Настройки для Weekly Cup бота',
    required: false,
  })
  @IsOptional()
  @IsObject({ message: 'Настройки Weekly Cup должны быть объектом' })
  weeklyCupSettings?: any;

  @ApiProperty({
    description: 'Настройки для Family Bot',
    required: false,
  })
  @IsOptional()
  @IsObject({ message: 'Настройки Family Bot должны быть объектом' })
  familyBotSettings?: any;
}
