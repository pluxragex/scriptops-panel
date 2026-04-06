import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class DeleteFileDto {
  @ApiProperty({
    description: 'ID сервера',
    example: 'clx1234567890',
  })
  @IsString()
  serverId: string;

  @ApiProperty({
    description: 'Путь к файлу или директории для удаления',
    example: '/home/user/file.txt',
  })
  @IsString()
  path: string;
}


