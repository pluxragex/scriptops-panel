import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsInt, Min, Max, IsUrl } from 'class-validator';

export class CreateNewsDto {
  @ApiProperty({
    description: 'Заголовок новости',
    example: 'Новая функция в системе управления скриптами',
    minLength: 3,
    maxLength: 200,
  })
  @IsString({ message: 'Заголовок должен быть строкой' })
  @IsNotEmpty({ message: 'Заголовок не может быть пустым' })
  title: string;

  @ApiProperty({
    description: 'Содержимое новости',
    example: 'Мы рады сообщить о добавлении новой функции...',
  })
  @IsString({ message: 'Содержимое должно быть строкой' })
  @IsNotEmpty({ message: 'Содержимое не может быть пустым' })
  content: string;

  @ApiProperty({
    description: 'Краткое описание новости',
    example: 'Краткое описание основных изменений',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Краткое описание должно быть строкой' })
  excerpt?: string;

  @ApiProperty({
    description: 'URL изображения',
    example: 'https://example.com/image.jpg',
    required: false,
  })
  @IsOptional()
  @IsUrl({}, { message: 'URL изображения должен быть валидным' })
  imageUrl?: string;

  @ApiProperty({
    description: 'URL видео',
    example: 'https://youtube.com/watch?v=example',
    required: false,
  })
  @IsOptional()
  @IsUrl({}, { message: 'URL видео должен быть валидным' })
  videoUrl?: string;

  @ApiProperty({
    description: 'Опубликовать новость сразу',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'Статус публикации должен быть булевым значением' })
  isPublished?: boolean;

  @ApiProperty({
    description: 'Сделать новость рекомендуемой',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'Статус рекомендуемой должен быть булевым значением' })
  isFeatured?: boolean;

  @ApiProperty({
    description: 'Приоритет отображения (0-100)',
    example: 50,
    minimum: 0,
    maximum: 100,
    required: false,
  })
  @IsOptional()
  @IsInt({ message: 'Приоритет должен быть целым числом' })
  @Min(0, { message: 'Приоритет не может быть меньше 0' })
  @Max(100, { message: 'Приоритет не может быть больше 100' })
  priority?: number;
}
