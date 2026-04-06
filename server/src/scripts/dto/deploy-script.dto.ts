import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum, IsUrl } from 'class-validator';

export enum DeploymentType {
  UPLOAD = 'UPLOAD',
  GIT_PULL = 'GIT_PULL',
  MANUAL = 'MANUAL',
}

export class DeployScriptDto {
  @ApiProperty({
    description: 'Тип деплоймента',
    enum: DeploymentType,
    example: DeploymentType.UPLOAD,
  })
  @IsEnum(DeploymentType, { message: 'Неверный тип деплоймента' })
  type: DeploymentType;

  @ApiProperty({
    description: 'Путь к загруженному файлу (для типа UPLOAD)',
    example: '/uploads/script.tar.gz',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Путь к файлу должен быть строкой' })
  filePath?: string;

  @ApiProperty({
    description: 'URL Git репозитория (для типа GIT_PULL)',
    example: 'https://github.com/user/repo.git',
    required: false,
  })
  @IsOptional()
  @IsUrl({}, { message: 'Некорректный URL репозитория' })
  repoUrl?: string;

  @ApiProperty({
    description: 'Версия скрипта',
    example: 'v1.0.0',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Версия должна быть строкой' })
  version?: string;
}
