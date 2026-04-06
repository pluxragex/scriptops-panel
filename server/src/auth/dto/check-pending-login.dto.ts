import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class CheckPendingLoginDto {
  @ApiProperty({
    description: 'Токен ожидающего подтверждения входа',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString({ message: 'Токен должен быть строкой' })
  @IsNotEmpty({ message: 'Токен обязателен' })
  loginToken: string;
}

