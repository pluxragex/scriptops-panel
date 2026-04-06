import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class ListFilesDto {
  @ApiProperty({
    description: 'ID сервера',
    example: 'clx1234567890',
  })
  @IsString()
  serverId: string;

  @ApiProperty({
    description: 'Путь к директории',
    example: '/home/user',
    required: false,
  })
  @IsString()
  @IsOptional()
  path?: string;
}


