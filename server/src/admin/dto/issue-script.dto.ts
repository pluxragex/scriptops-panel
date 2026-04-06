import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, Min, Max } from 'class-validator';

export class IssueScriptDto {
  @ApiProperty({
    description: 'ID пользователя, которому выдается скрипт',
    example: 'user-123',
  })
  @IsString({ message: 'ID пользователя должен быть строкой' })
  @IsNotEmpty({ message: 'ID пользователя не может быть пустым' })
  userId: string;

  @ApiProperty({
    description: 'ID сервера для размещения скрипта',
    example: 'server-123',
  })
  @IsString({ message: 'ID сервера должен быть строкой' })
  @IsNotEmpty({ message: 'ID сервера не может быть пустым' })
  serverId: string;

  @ApiProperty({
    description: 'Количество дней действия скрипта',
    example: 30,
    minimum: 1,
    maximum: 365,
  })
  @IsNumber({}, { message: 'Количество дней должно быть числом' })
  @Min(1, { message: 'Минимум 1 день' })
  @Max(365, { message: 'Максимум 365 дней' })
  expiryDays: number;
}
