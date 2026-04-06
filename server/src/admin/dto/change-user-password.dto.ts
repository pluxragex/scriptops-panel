import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class ChangeUserPasswordDto {
  @ApiProperty({
    description: 'Новый пароль пользователя',
    example: 'NewSecurePassword123',
    minLength: 6,
  })
  @IsString({ message: 'Пароль должен быть строкой' })
  @IsNotEmpty({ message: 'Пароль не может быть пустым' })
  @MinLength(6, { message: 'Пароль должен содержать минимум 6 символов' })
  newPassword: string;

  @ApiProperty({
    description: 'Причина изменения пароля',
    example: 'Пользователь забыл пароль',
  })
  @IsString({ message: 'Причина должна быть строкой' })
  @IsNotEmpty({ message: 'Причина не может быть пустой' })
  reason: string;
}

