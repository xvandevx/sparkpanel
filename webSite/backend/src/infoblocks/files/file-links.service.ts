import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Transaction } from 'sequelize';
import { LinkTargetsService } from '../settings/links/link-targets.service';
import { PropertyType } from '../settings/properties/property';
import { InfoblockProperty } from '../settings/properties/property.model';
import { InfoblockSettings } from '../settings/settings.model';
import { PropertyValue } from '../values/property-values.model';
import { InfoblockRecord } from '../values/record.model';
import { FileLinkDto } from './dto/file.dto';

/** Свойства, значение которых — номер файла. */
const FILE_TYPES = [PropertyType.File, PropertyType.Image];

/**
 * К каким записям привязаны файлы. Отдельной таблицы связей нет: привязка —
 * это значение свойства «Файл» или «Изображение» у записи (`infoblock_values`,
 * номер файла в колонке `number`). Значение и есть единственный источник —
 * вторая копия связи расходилась бы с ним после первой же правки записи.
 *
 * Поэтому один файл может быть привязан к скольким угодно записям: каждая
 * выбрала его своим значением.
 */
@Injectable()
export class FileLinksService {
  constructor(
    @InjectModel(InfoblockSettings) private readonly settingsRepo: typeof InfoblockSettings,
    @InjectModel(InfoblockProperty) private readonly propertyRepo: typeof InfoblockProperty,
    @InjectModel(PropertyValue) private readonly valueRepo: typeof PropertyValue,
    @InjectModel(InfoblockRecord) private readonly recordRepo: typeof InfoblockRecord,
    private readonly linkTargets: LinkTargetsService,
  ) {}

  /** Привязки всех файлов пользователя: номер файла → записи, выбравшие его. */
  async linksOf(): Promise<Map<number, FileLinkDto[]>> {
    const links = new Map<number, FileLinkDto[]>();

    const { settings, properties } = await this.fileProperties();
    if (properties.length === 0) return links;

    const values = await this.valueRepo.findAll({
      where: { propertyId: properties.map((property) => property.id) },
    });
    if (values.length === 0) return links;

    const records = await this.recordRepo.findAll({
      where: { id: unique(values.map((value) => value.recordId)) },
    });

    const settingsById = new Map(settings.map((item) => [item.id, item]));
    const propertyById = new Map(properties.map((property) => [property.id, property]));
    const recordById = new Map(records.map((record) => [record.id, record]));

    // Названия записей знают их разделы; что раздел не отдаёт — покажем ключом.
    // Спрашиваем только списки, в которых лежат записи с файлами
    const listKeys = unique(
      records.flatMap((record) => {
        const list = settingsById.get(record.settingsId);
        return list ? [list.listKey] : [];
      }),
    );
    const names = new Map(
      (await this.linkTargets.findAll(listKeys)).map((target) => [
        `${target.listKey}/${target.recordId}`,
        target.name,
      ]),
    );

    for (const value of values) {
      const property = propertyById.get(value.propertyId);
      const record = recordById.get(value.recordId);
      const list = record ? settingsById.get(record.settingsId) : undefined;
      if (!property || !record || !list || value.number === null) continue;

      const fileId = value.number;
      const items = links.get(fileId) ?? [];
      const isKnown = items.some(
        (item) => item.listKey === list.listKey && item.recordId === record.recordKey && item.propertyId === property.id,
      );
      if (isKnown) continue;

      items.push({
        listKey: list.listKey,
        listName: list.name,
        recordId: record.recordKey,
        recordName: names.get(`${list.listKey}/${record.recordKey}`) ?? null,
        propertyId: property.id,
        propertyName: property.name,
      });
      links.set(fileId, items);
    }

    return links;
  }

  /**
   * Файл удаляют — записи его забывают: значение со ссылкой в никуда карточка
   * показать не сможет, а сайт отдал бы битую картинку.
   */
  async forget(fileId: number, transaction: Transaction): Promise<void> {
    const { properties } = await this.fileProperties(transaction);
    if (properties.length === 0) return;

    await this.valueRepo.destroy({
      where: { propertyId: properties.map((property) => property.id), number: fileId },
      transaction,
    });
  }

  /** Списки пользователя и их свойства-файлы: значения ищутся только в своих. */
  private async fileProperties(transaction?: Transaction) {
    const settings = await this.settingsRepo.findAll({ transaction });
    const properties = settings.length
      ? await this.propertyRepo.findAll({
          where: { settingsId: settings.map((item) => item.id), type: FILE_TYPES },
          transaction,
        })
      : [];
    return { settings, properties };
  }
}

const unique = <T>(list: T[]): T[] => Array.from(new Set(list));
