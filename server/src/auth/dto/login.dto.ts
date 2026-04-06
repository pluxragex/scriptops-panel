import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    description: 'Email пользователя',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: 'Некорректный email адрес' })
  email: string;

  @ApiProperty({
    description: 'Пароль',
    example: 'password123',
  })
  @IsString({ message: 'Пароль должен быть строкой' })
  @MinLength(1, { message: 'Пароль не может быть пустым' })
  password: string;

  @ApiProperty({
    description: 'Код двухфакторной аутентификации (если требуется)',
    example: '123456',
    required: false,
  })
  @IsString({ message: 'Код должен быть строкой' })
  @IsOptional()
  twoFactorCode?: string;
}
