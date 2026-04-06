import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, MaxLength, Matches, IsOptional, IsEnum } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({
    description: 'Email пользователя',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: 'Некорректный email адрес' })
  email: string;

  @ApiProperty({
    description: 'Имя пользователя',
    example: 'testuser',
    minLength: 3,
    maxLength: 20,
  })
  @IsString({ message: 'Имя пользователя должно быть строкой' })
  @MinLength(3, { message: 'Имя пользователя должно содержать минимум 3 символа' })
  @MaxLength(20, { message: 'Имя пользователя должно содержать максимум 20 символов' })
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'Имя пользователя может содержать только буквы, цифры и подчеркивания',
  })
  username: string;

  @ApiProperty({
    description: 'Пароль',
    example: 'password123',
    minLength: 8,
  })
  @IsString({ message: 'Пароль должен быть строкой' })
  @MinLength(8, { message: 'Пароль должен содержать минимум 8 символов' })
  password: string;

  @ApiProperty({
    description: 'Роль пользователя',
    example: 'USER',
    enum: ['USER', 'ADMIN', 'SUPER_ADMIN'],
    required: false,
    default: 'USER',
  })
  @IsOptional()
  @IsEnum(['USER', 'ADMIN', 'SUPER_ADMIN'], { message: 'Роль должна быть одной из: USER, ADMIN, SUPER_ADMIN' })
  role?: string;
}


