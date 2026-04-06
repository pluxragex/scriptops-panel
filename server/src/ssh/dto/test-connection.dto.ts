import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class TestConnectionDto {
  @ApiProperty({
    description: 'ID сервера для тестирования соединения',
    example: 'server-123',
  })
  @IsString({ message: 'ID сервера должен быть строкой' })
  @IsNotEmpty({ message: 'ID сервера не может быть пустым' })
  serverId: string;
}
