import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsInt, Min, Max, IsBoolean, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class NewsQueryDto {
  @ApiProperty({
    description: 'Номер страницы',
    example: 1,
    minimum: 1,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt({ message: 'Номер страницы должен быть целым числом' })
  @Min(1, { message: 'Номер страницы не может быть меньше 1' })
  page?: number = 1;

  @ApiProperty({
    description: 'Количество новостей на странице',
    example: 10,
    minimum: 1,
    maximum: 50,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt({ message: 'Лимит должен быть целым числом' })
  @Min(1, { message: 'Лимит не может быть меньше 1' })
  @Max(50, { message: 'Лимит не может быть больше 50' })
  limit?: number = 10;

  @ApiProperty({
    description: 'Показывать только опубликованные новости',
    example: true,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => {

    if (value === undefined || value === null || value === '') {
      return true;
    }

    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }

    return value === true;
  })
  @IsBoolean({ message: 'Параметр published должен быть булевым значением' })
  published?: boolean = true;

  @ApiProperty({
    description: 'Показывать только рекомендуемые новости',
    example: false,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    return value === 'true' || value === true;
  })
  @IsBoolean({ message: 'Параметр featured должен быть булевым значением' })
  featured?: boolean;

  @ApiProperty({
    description: 'Поиск по заголовку или содержимому',
    example: 'новости',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Поисковый запрос должен быть строкой' })
  search?: string;
}
