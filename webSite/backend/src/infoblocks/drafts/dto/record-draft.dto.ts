import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsObject,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { PropertyValueDto } from '../../values/property-values.dto';
import { InfoblockDraft } from '../draft.model';

/** Черновик записи: что изменено относительно опубликованного, кем и когда. */
export class RecordDraftDto {
  @ApiProperty({ example: '2', description: 'Ключ записи в списке' })
  recordId: string;

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    example: { name: 'О нас', code: 'o-nas' },
    description: 'Изменённые поля записи — как их принимает PATCH раздела',
  })
  fields: Record<string, unknown>;

  @ApiProperty({ type: [PropertyValueDto], description: 'Изменённые свойства записи' })
  values: PropertyValueDto[];

  @ApiProperty({ example: false, description: 'Запись заведена черновиком и на сайте её ещё нет' })
  isNew: boolean;

  @ApiProperty({ example: 'admin@example.com', description: 'Кто сохранил черновик последним' })
  authorEmail: string;

  @ApiProperty({ description: 'Когда черновик сохранили последний раз' })
  updatedAt: Date;

  static from(draft: InfoblockDraft): RecordDraftDto {
    return {
      recordId: draft.recordKey,
      fields: draft.fields ?? {},
      values: draft.values ?? [],
      isNew: draft.isNew === true,
      authorEmail: draft.authorEmail,
      updatedAt: draft.updatedAt,
    };
  }
}

/** Черновик одной записи; у записи без черновика — null. */
export class RecordDraftStateDto {
  @ApiProperty({ example: '2' })
  recordId: string;

  @ApiProperty({ type: RecordDraftDto, nullable: true })
  draft: RecordDraftDto | null;
}

/**
 * Сохранить черновик: изменённое целиком, а не добавку к прежнему черновику —
 * карточка сравнивает с опубликованным и знает, что сейчас отличается.
 * Значения сервер здесь не проверяет: проверит публикация, тем же сохранением,
 * что и без черновика.
 */
export class SaveRecordDraftDto {
  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    example: { name: 'О нас' },
    description: 'Изменённые поля записи — как их принимает PATCH раздела',
  })
  @IsObject()
  fields: Record<string, unknown>;

  @ApiProperty({ type: [PropertyValueDto] })
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => PropertyValueDto)
  values: PropertyValueDto[];

  @ApiProperty({
    example: false,
    required: false,
    description:
      'Запись только что заведена черновиком: на сайте её нет до публикации. ' +
      'Учитывается, только когда черновика у записи ещё не было',
  })
  @IsOptional()
  @IsBoolean()
  isNew?: boolean;
}
