import { ApiProperty } from '@nestjs/swagger';
import { hasDrafts, hasJournal, listDefaultName, listMaxDepth } from '../infoblock-kinds';
import { InfoblockSettings } from '../settings.model';

/**
 * Настройки списка: имя, код и правила записей. Вкладки карточки и свойства
 * записей приходят своими запросами — они отдельные сущности.
 *
 * Пока настройки не сохраняли, код — null, а имя — по виду списка: у каждого
 * списка настройки есть всегда, просто несохранённые.
 */
export class InfoblockSettingsDto {
  @ApiProperty({ example: 'infoblock-elements.3' })
  listKey: string;

  @ApiProperty({ example: 'Новости', nullable: true, description: 'Имя списка' })
  name: string | null;

  @ApiProperty({ example: 'news', nullable: true, description: 'Код списка' })
  code: string | null;

  @ApiProperty({
    example: true,
    description: 'Правило редактора: показывать ли у записей поле «Код». Сервер его не проверяет',
  })
  useCode: boolean;

  @ApiProperty({
    example: false,
    description: 'Правило редактора: требовать код перед сохранением записи',
  })
  codeRequired: boolean;

  @ApiProperty({
    example: false,
    description: 'Правило редактора: сверять код с кодами остальных записей списка',
  })
  codeUnique: boolean;

  @ApiProperty({
    example: true,
    description: 'У списка есть журнал изменений: правки его записей пишутся в историю',
  })
  hasJournal: boolean;

  @ApiProperty({
    example: true,
    description:
      'Журнал ведётся: правки записей пишутся в историю, и редактор её показывает. Всегда false у списка без журнала',
  })
  isHistoryEnabled: boolean;

  @ApiProperty({
    example: true,
    description: 'Записям списка бывают черновики: у файлов их нет, у остальных включаются галочкой',
  })
  hasDrafts: boolean;

  @ApiProperty({
    example: false,
    description:
      'Черновики включены: правки сохраняются черновиком и попадают в записи по «Опубликовать». Всегда false у списка без черновиков',
  })
  isDraftEnabled: boolean;

  @ApiProperty({
    example: 2,
    nullable: true,
    type: Number,
    description:
      'Уровней вложенности; он же решает, дерево ли список: 1 — плоский, больше — дерево, null — дерево без ограничения',
  })
  maxDepth: number | null;

  static empty(listKey: string): InfoblockSettingsDto {
    return {
      listKey,
      // Имя есть и у несохранённых настроек — по виду списка: оно заголовок раздела
      name: listDefaultName(listKey),
      code: null,
      // Код у записей есть по умолчанию: так ведут себя все разделы панели
      useCode: true,
      codeRequired: false,
      codeUnique: false,
      hasJournal: hasJournal(listKey),
      // Журнал ведётся, пока его не выключили в настройках
      isHistoryEnabled: hasJournal(listKey),
      hasDrafts: hasDrafts(listKey),
      isDraftEnabled: false,
      // У несохранённых настроек предел — по умолчанию вида списка
      maxDepth: listMaxDepth(null, listKey),
    };
  }

  static from(settings: InfoblockSettings): InfoblockSettingsDto {
    return {
      listKey: settings.listKey,
      name: settings.name,
      code: settings.code,
      // Настройки, сохранённые до появления галочки, — с кодом: он у записей был
      useCode: settings.useCode !== false,
      codeRequired: settings.codeRequired === true,
      codeUnique: settings.codeUnique === true,
      hasJournal: hasJournal(settings.listKey),
      isHistoryEnabled: hasJournal(settings.listKey) && settings.isHistoryEnabled !== false,
      hasDrafts: hasDrafts(settings.listKey),
      isDraftEnabled: hasDrafts(settings.listKey) && settings.isDraftEnabled === true,
      maxDepth: settings.maxDepth ?? null,
    };
  }
}
