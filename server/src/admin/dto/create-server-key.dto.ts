import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateServerKeyDto {
  @ApiProperty({
    description: 'Метка для ключа',
    example: 'Production Server Key',
  })
  @IsString({ message: 'Метка должна быть строкой' })
  @IsNotEmpty({ message: 'Метка не может быть пустой' })
  label: string;

  @ApiProperty({
    description: 'Приватный SSH ключ',
    example: '-----BEGIN OPENSSH PRIVATE KEY-----\n...',
  })
  @IsString({ message: 'Приватный ключ должен быть строкой' })
  @IsNotEmpty({ message: 'Приватный ключ не может быть пустым' })
  privateKey: string;

  @ApiProperty({
    description: 'Публичный SSH ключ',
    example: 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQC...',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Публичный ключ должен быть строкой' })
  publicKey?: string;
}
