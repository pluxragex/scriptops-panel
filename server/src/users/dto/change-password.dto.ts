import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, Matches } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({
    description: 'Текущий пароль пользователя',
    example: 'currentPassword123',
  })
  @IsString({ message: 'Текущий пароль должен быть строкой' })
  currentPassword: string;

  @ApiProperty({
    description: 'Новый пароль',
    example: 'newPassword123',
    minLength: 8,
  })
  @IsString({ message: 'Новый пароль должен быть строкой' })
  @MinLength(8, { message: 'Пароль должен содержать минимум 8 символов' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Пароль должен содержать минимум одну строчную букву, одну заглавную букву и одну цифру',
  })
  newPassword: string;
}
