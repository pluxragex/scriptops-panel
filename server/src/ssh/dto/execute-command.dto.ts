import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class ExecuteCommandDto {
  @ApiProperty({
    description: 'ID сервера',
    example: 'clx1234567890',
  })
  @IsString()
  @IsNotEmpty()
  serverId: string;

  @ApiProperty({
    description: 'Команда для выполнения',
    example: 'ls -la',
  })
  @IsString()
  @IsNotEmpty()
  command: string;

  @ApiProperty({
    description: 'Рабочая директория для выполнения команды',
    example: '/home/user',
    required: false,
  })
  @IsString()
  @IsOptional()
  cwd?: string;
}


