import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, MaxLength, Matches, IsOptional } from 'class-validator';

export class UpdateUserDto {
  @ApiProperty({
    description: 'Имя пользователя',
    example: 'newusername',
    required: false,
    minLength: 3,
    maxLength: 20,
  })
  @IsOptional()
  @IsString({ message: 'Имя пользователя должно быть строкой' })
  @MinLength(3, { message: 'Имя пользователя должно содержать минимум 3 символа' })
  @MaxLength(20, { message: 'Имя пользователя должно содержать максимум 20 символов' })
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'Имя пользователя может содержать только буквы, цифры и подчеркивания',
  })
  username?: string;

  @ApiProperty({
    description: 'Email пользователя',
    example: 'newemail@example.com',
    required: false,
  })
  @IsOptional()
  @IsEmail({}, { message: 'Некорректный email адрес' })
  email?: string;
}
