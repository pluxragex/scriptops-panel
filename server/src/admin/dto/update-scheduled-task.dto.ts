import { PartialType } from '@nestjs/mapped-types'
import { CreateScheduledTaskDto } from './create-scheduled-task.dto'
import { IsOptional, IsBoolean } from 'class-validator'

export class UpdateScheduledTaskDto extends PartialType(CreateScheduledTaskDto) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}


