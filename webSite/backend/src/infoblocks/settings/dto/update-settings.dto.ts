import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

/** Код списка — как у остальных кодов панели: строчные латинские буквы, цифры, дефис. */
export const LIST_CODE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Свойств больше полусотни шторка уже не покажет по-человечески. */
export const LIST_PROPERTIES_MAX = 50;

/** Вкладок больше десятка в карточке уже не читается. */
export const LIST_TABS_MAX = 10;

/** Настройки списка: устройство и правила записей. Свойства сохраняются своим запросом. */
export class UpdateInfoblockSettingsDto {
  /**
   * Имя и код списка окно настроек не правит: их задаёт панель (имя по виду
   * списка, у элементов типа контента — сам тип). Не прислали — прежние
   */
  @ApiProperty({ example: 'Новости', required: false, description: 'Имя списка; не прислали — прежнее' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name?: string;

  @ApiProperty({ example: 'news', required: false, description: 'Код списка; не прислали — прежний' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  @Matches(LIST_CODE_PATTERN, {
    message: 'Код списка: строчные латинские буквы, цифры и дефис между ними',
  })
  code?: string;

  /**
   * Три правила символьного кода записей. Их применяет **редактор** — поле «Код»
   * в карточке и колонка в таблице; собственные проверки разделов (непустой код,
   * уникальный индекс в базе) ими не отменяются и работают как прежде.
   */
  @ApiProperty({
    example: true,
    required: false,
    description: 'Правило редактора: показывать ли у записей поле «Код»',
  })
  @IsOptional()
  @IsBoolean()
  useCode?: boolean;

  @ApiProperty({
    example: false,
    required: false,
    description: 'Правило редактора: требовать код перед сохранением записи',
  })
  @IsOptional()
  @IsBoolean()
  codeRequired?: boolean;

  @ApiProperty({
    example: false,
    required: false,
    description: 'Правило редактора: сверять код с кодами остальных записей списка',
  })
  @IsOptional()
  @IsBoolean()
  codeUnique?: boolean;

  @ApiProperty({
    example: true,
    required: false,
    description:
      'Вести журнал изменений. У списка, у которого журнала нет вовсе (файлы, домены), ни на что не влияет',
  })
  @IsOptional()
  @IsBoolean()
  isHistoryEnabled?: boolean;

  @ApiProperty({
    example: false,
    required: false,
    description:
      'Сохранять правки записей черновиком. Выключить нельзя, пока в списке есть черновики; у файлов ни на что не влияет',
  })
  @IsOptional()
  @IsBoolean()
  isDraftEnabled?: boolean;

  @ApiProperty({
    example: 2,
    required: false,
    nullable: true,
    type: Number,
    description:
      'Уровней вложенности: 1 — плоский список, больше — дерево, null — дерево без ограничения',
  })
  // `null` — осознанное «дерево без ограничения», его не отбрасываем
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsInt()
  @Min(1)
  @Max(20)
  maxDepth?: number | null;
}
