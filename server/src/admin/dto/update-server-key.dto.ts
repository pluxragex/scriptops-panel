import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class UpdateServerKeyDto {
  @ApiProperty({
    description: 'Название SSH ключа',
    example: 'Production Server Key',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Название должно быть строкой' })
  @IsNotEmpty({ message: 'Название не может быть пустым' })
  label?: string;

  @ApiProperty({
    description: 'Приватный ключ',
    example: '-----BEGIN OPENSSH PRIVATE KEY-----\n...\n-----END OPENSSH PRIVATE KEY-----',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Приватный ключ должен быть строкой' })
  @IsNotEmpty({ message: 'Приватный ключ не может быть пустым' })
  privateKey?: string;

  @ApiProperty({
    description: 'Публичный ключ',
    example: 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQC...',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Публичный ключ должен быть строкой' })
  publicKey?: string;
}
