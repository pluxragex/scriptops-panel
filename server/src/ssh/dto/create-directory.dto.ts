import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateDirectoryDto {
  @ApiProperty({
    description: 'ID сервера',
    example: 'clx1234567890',
  })
  @IsString()
  serverId: string;

  @ApiProperty({
    description: 'Путь к директории для создания',
    example: '/home/user/newdir',
  })
  @IsString()
  path: string;
}


