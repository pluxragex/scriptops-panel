import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, Min, Max, IsOptional } from 'class-validator';

export class UpdateServerDto {
  @ApiProperty({
    description: 'Название сервера',
    example: 'Production Server 1',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Название должно быть строкой' })
  @IsNotEmpty({ message: 'Название не может быть пустым' })
  name?: string;

  @ApiProperty({
    description: 'IP адрес или домен сервера',
    example: '192.168.1.100',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Хост должен быть строкой' })
  @IsNotEmpty({ message: 'Хост не может быть пустым' })
  host?: string;

  @ApiProperty({
    description: 'SSH порт',
    example: 22,
    minimum: 1,
    maximum: 65535,
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Порт должен быть числом' })
  @Min(1, { message: 'Минимум порт 1' })
  @Max(65535, { message: 'Максимум порт 65535' })
  port?: number;

  @ApiProperty({
    description: 'SSH пользователь',
    example: 'deploy',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'SSH пользователь должен быть строкой' })
  sshUser?: string;

  @ApiProperty({
    description: 'ID SSH ключа',
    example: 'key-123',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'ID ключа должен быть строкой' })
  keyId?: string;
}
