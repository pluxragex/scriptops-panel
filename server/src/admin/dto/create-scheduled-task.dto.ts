import { IsString, IsEnum, IsOptional, IsBoolean, IsObject, MinLength, MaxLength, Matches } from 'class-validator'

export enum ScheduledTaskType {
  CHECK_AUTO_UPDATE = 'CHECK_AUTO_UPDATE',
  CHECK_SCRIPT_EXPIRY = 'CHECK_SCRIPT_EXPIRY',
  AUTO_RELOAD_SCRIPTS = 'AUTO_RELOAD_SCRIPTS',
  CLEANUP_OLD_LOGS = 'CLEANUP_OLD_LOGS',
  BACKUP_DATABASE = 'BACKUP_DATABASE',
  HEALTH_CHECK = 'HEALTH_CHECK',
}

export class CreateScheduledTaskDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string

  @IsEnum(ScheduledTaskType)
  taskType: ScheduledTaskType

  @IsString()
  @Matches(/^(\*|([0-9]|[1-5][0-9])|\*\/([0-9]|[1-5][0-9])) (\*|([0-9]|1[0-9]|2[0-3])|\*\/([0-9]|1[0-9]|2[0-3])) (\*|([1-9]|[12][0-9]|3[01])|\*\/([1-9]|[12][0-9]|3[01])) (\*|([1-9]|1[0-2])|\*\/([1-9]|1[0-2])) (\*|([0-6])|\*\/([0-6]))$/, {
    message: 'Неверный формат cron выражения. Используйте формат: минута час день месяц день_недели',
  })
  cronExpression: string

  @IsOptional()
  @IsString()
  timezone?: string

  @IsOptional()
  @IsObject()
  parameters?: Record<string, any>

  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}


