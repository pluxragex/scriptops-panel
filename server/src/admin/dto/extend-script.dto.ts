import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min, Max, IsOptional } from 'class-validator';

export class ExtendScriptDto {
  @ApiProperty({
    description: 'Количество дней для продления (null для бессрочно)',
    example: 30,
    minimum: 1,
    maximum: 365,
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Количество дней должно быть числом' })
  @Min(1, { message: 'Минимум 1 день' })
  @Max(365, { message: 'Максимум 365 дней' })
  days: number | null;
}
