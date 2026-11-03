import { BadRequestException, ConflictException, Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { Op, QueryTypes, Transaction } from 'sequelize';
import { Files } from '../files/files.model';
import { Domains } from '../domains/domains.model';
import { HistoryAction } from '../history/history.model';
import { HistoryAuthor, HistoryService } from '../history/history.service';
import {
  PropertyValueDto,
  PropertyValuesDto,
  RecordValuesDto,
  UpdatePropertyValuesDto,
} from './property-values.dto';
import { RemovedPropertyValuesDto } from './remove-property-values.dto';
import { LinkTargetsService } from '../settings/links/link-targets.service';
import { assertRecordId, ResolvedInfoblock, resolveInfoblock } from '../settings/infoblock-kinds';
import { InfoblockPropertyDto } from '../settings/properties/property.dto';
import {
  DomainGroup,
  PropertyType,
  PropertyValueMap,
  fileRuleError,
  normalizeValues,
  plainValues,
  referencedDomainIds,
  referencedIds,
  referencedLinks,
  valuesSnapshot,
} from '../settings/properties/property';
import { InfoblockSettingsService } from '../settings/settings.service';
import { InfoblockDraft } from '../drafts/draft.model';
import { parentError, reparentAfterRemove } from './records-tree';
import { PropertyValue } from './property-values.model';
import { InfoblockRecord } from './record.model';

/** Ключ родителя в снимке журнала: совпадает с полем формы «Родитель». */
const PARENT_SNAPSHOT_KEY = 'tree.parentId';

/** Ключ внешнего ID в снимке журнала. */
const EXTERNAL_ID_SNAPSHOT_KEY = 'externalId';

/** Скрытое значение в журнале: видно, что его меняли, но не на что. */
const HIDDEN_SNAPSHOT_VALUE = '••••••';

/**
 * Проверка значений, которую добавляет раздел: свойства общие, а правила вроде
 * «адрес уникален среди соседей» или «хранилище отвечает» — его. Получает
 * значения записи после правки целиком, по кодам, вместе со скрытыми; бросает
 * исключение — правка откатывается.
 */
export type ValuesCheck = (context: {
  recordId: string;
  /** Коды присланных свойств: проверять имеет смысл то, что правили */
  touched: string[];
  values: PropertyValueMap;
  transaction: Transaction;
}) => Promise<void>;

/**
 * Значения свойств записей и их место в дереве. Сама запись живёт в своём
 * разделе — здесь только то, что задано настройками списка. Правки пишутся
 * в журнал раздела: история записи одна на все её поля.
 *
 * Хранение — строка на значение, с номером свойства: по строкам ищут
 * и сортируют, а номер не меняется, когда свойству правят код. Наружу значения
 * отдаются тем же номером, а внутри сервиса раскладываются по кодам: проверки
 * типов, снимок для журнала и ссылки работают с кодами и о хранении не знают.
 */
@Injectable()
export class PropertyValuesService implements OnApplicationBootstrap {
  /** Вид списка → проверка его раздела (`registerCheck`) */
  private readonly checks = new Map<string, ValuesCheck>();

  constructor(
    @InjectModel(InfoblockRecord) private readonly recordsRepo: typeof InfoblockRecord,
    @InjectModel(PropertyValue) private readonly valuesRepo: typeof PropertyValue,
    // Файлы здесь только читаются: ссылаться можно лишь на существующие
    @InjectModel(Files) private readonly fileRepo: typeof Files,
    // Домены общие на сайт — только проверяем, что такие есть
    @InjectModel(Domains) private readonly domainRepo: typeof Domains,
    // Удалили запись — её черновик публиковать уже нечем
    @InjectModel(InfoblockDraft) private readonly draftsRepo: typeof InfoblockDraft,
    @InjectConnection() private readonly sequelize: Sequelize,
    private readonly settingsService: InfoblockSettingsService,
    private readonly linkTargets: LinkTargetsService,
    private readonly historyService: HistoryService,
  ) {}

  /**
   * Значения «Списка», сохранённые прежними версиями, хранили код варианта
   * текстом — и терялись, когда код правили. Теперь значение — ссылка на вариант
   * в `optionId`; при старте переводим старые строки, чей код ещё находится
   * среди вариантов. Повторный запуск ничего не меняет: переведённых строк
   * с текстом уже нет. Код, которого среди вариантов больше нет, прочитать
   * нечем — такая строка не читается и уйдёт со следующим сохранением записи.
   */
  async onApplicationBootstrap(): Promise<void> {
    await this.sequelize.query(`
      UPDATE infoblock_values AS v
      SET "optionId" = o.id, text = NULL
      FROM infoblock_settings_property_options AS o
      WHERE o."propertyId" = v."propertyId" AND o.code = v.text AND v."optionId" IS NULL
    `);
  }

  /**
   * Раздел добавляет свою проверку значений своего вида списка. Зовут её
   * сами разделы при старте: модуль значений о разделах не знает — они
   * импортируют его, а не наоборот.
   */
  registerCheck(kind: string, check: ValuesCheck): void {
    this.checks.set(kind, check);
  }

  /**
   * Значения записей списка по кодам свойств, вместе со скрытыми, — для самого
   * сервера: адрес страницы, ключи хранилища. Наружу так не отдаётся.
   */
  async codeValues(
    listKey: string,
    transaction?: Transaction,
  ): Promise<Map<string, PropertyValueMap>> {
    const { key } = resolveInfoblock(listKey);
    const { properties } = await this.settingsService.settingsOf(key, transaction);
    const settingsId = await this.settingsService.settingsId(key, transaction);
    if (settingsId === null) return new Map();

    const records = await this.recordsRepo.findAll({ where: { settingsId }, transaction });
    const rows = records.length
      ? await this.valuesRepo.findAll({
          where: { recordId: records.map((record) => record.id) },
          order: [['sort', 'ASC']],
          transaction,
        })
      : [];
    const keyById = new Map(records.map((record) => [record.id, record.recordKey]));
    const byRecord = new Map<string, PropertyValue[]>();
    for (const row of rows) {
      const recordKey = keyById.get(row.recordId) as string;
      byRecord.set(recordKey, [...(byRecord.get(recordKey) ?? []), row]);
    }
    return new Map(
      Array.from(byRecord, ([recordKey, items]) => [
        recordKey,
        normalizeValues(properties, valuesMap(properties, items), false).values,
      ]),
    );
  }

  /**
   * Значения и родители всех записей списка. Читаются по текущим
   * настройкам: что под них уже не подходит (вариант убрали, множественность
   * выключили), не отдаётся.
   */
  async findAll(listKey: string): Promise<PropertyValuesDto[]> {
    return this.read(listKey, null);
  }

  /**
   * Значения части записей и части свойств — без чтения всего списка:
   * внешнему API на отбор нужны только свойства фильтра, а на ответ — только
   * записи страницы. `recordIds` null — все записи списка.
   */
  async findSome(listKey: string, recordIds: string[] | null, propertyIds: number[]): Promise<PropertyValuesDto[]> {
    if (propertyIds.length === 0 || recordIds?.length === 0) return [];
    return this.read(listKey, recordIds, propertyIds);
  }

  /**
   * Записи списка, у которых свойство-привязка указывает на одну из записей
   * `recordIds` списка `linkList`, — запросом по индексу
   * `infoblock_values_property_link`, без чтения списка. Домены не
   * разбираются: подходит значение любого домена, точный отбор
   * мультидоменного свойства — дальше, по его значениям.
   */
  async linkedRecordIds(
    listKey: string,
    propertyId: number,
    linkList: string,
    recordIds: string[],
  ): Promise<Set<string>> {
    const settingsId = await this.settingsService.settingsId(resolveInfoblock(listKey).key);
    if (settingsId === null || recordIds.length === 0) return new Set();
    const rows = await this.sequelize.query<{ recordKey: string }>(
      `SELECT DISTINCT r."recordKey"
       FROM infoblock_values v JOIN infoblock_records r ON r.id = v."recordId"
       WHERE r."settingsId" = :settingsId AND v."propertyId" = :propertyId
         AND v.json->>'recordId' IN (:recordIds) AND v.json->>'listKey' = :linkList`,
      { replacements: { settingsId, propertyId, recordIds, linkList }, type: QueryTypes.SELECT },
    );
    return new Set(rows.map((row) => row.recordKey));
  }

  /**
   * Когда у записей списка последний раз правили значения свойств (или родителя
   * в дереве настроек): ключ записи → время. Записи без таких правок здесь нет.
   */
  async editedAt(listKey: string): Promise<Map<string, Date>> {
    const settingsId = await this.settingsService.settingsId(resolveInfoblock(listKey).key);
    if (settingsId === null) return new Map();
    const records = await this.recordsRepo.findAll({
      where: { settingsId },
      attributes: ['recordKey', 'updatedAt'],
    });
    return new Map(records.map((record) => [record.recordKey, record.updatedAt as Date]));
  }

  /**
   * Внешние ID записей списка: ключ записи → внешний ID. Записей без него
   * здесь нет.
   */
  async externalIds(listKey: string): Promise<Map<string, string>> {
    const settingsId = await this.settingsService.settingsId(resolveInfoblock(listKey).key);
    if (settingsId === null) return new Map();
    const records = await this.recordsRepo.findAll({
      where: { settingsId, externalId: { [Op.ne]: null } },
      attributes: ['recordKey', 'externalId'],
    });
    return new Map(records.map((record) => [record.recordKey, record.externalId as string]));
  }

  /**
   * Запись списка по внешнему ID — запросом по индексу, без чтения списка:
   * так ищет интеграция, у которой нет номеров панели. Нет такой — null.
   */
  async recordIdByExternalId(listKey: string, externalId: string): Promise<string | null> {
    const settingsId = await this.settingsService.settingsId(resolveInfoblock(listKey).key);
    if (settingsId === null) return null;
    const record = await this.recordsRepo.findOne({
      where: { settingsId, externalId },
      attributes: ['recordKey'],
    });
    return record?.recordKey ?? null;
  }

  /** Внешний ID одной записи; нет — null. */
  async externalIdOf(listKey: string, recordId: string): Promise<string | null> {
    const settingsId = await this.settingsService.settingsId(resolveInfoblock(listKey).key);
    if (settingsId === null) return null;
    const record = await this.recordsRepo.findOne({
      where: { settingsId, recordKey: recordId },
      attributes: ['externalId'],
    });
    return record?.externalId ?? null;
  }

  /**
   * Значения одной записи — карточке, открытой не с текущей страницы таблицы
   * (из журнала). Нет записи или значений — пустой набор, а не 404: значения
   * есть у любой записи, просто незаполненные.
   */
  async findOne(listKey: string, recordId: string): Promise<RecordValuesDto> {
    assertRecordId(recordId);
    const [found] = await this.read(listKey, [recordId]);
    return { recordId, values: found?.values ?? [] };
  }

  /**
   * Значения записей списка: всех (`recordIds` null) или перечисленных;
   * свойств — всех или перечисленных (`propertyIds`). Строки читаются без
   * моделей (`raw`): у списка в десятки тысяч записей на модели уходили секунды.
   */
  private async read(
    listKey: string,
    recordIds: string[] | null,
    propertyIds: number[] | null = null,
  ): Promise<PropertyValuesDto[]> {
    const { key } = resolveInfoblock(listKey);
    const { properties, isTree } = await this.settingsService.settingsOf(key);
    const settingsId = await this.settingsService.settingsId(key);
    if (settingsId === null) return [];

    const records = await this.recordsRepo.findAll({
      attributes: ['id', 'recordKey', 'parentId'],
      where: { settingsId, ...(recordIds === null ? {} : { recordKey: recordIds }) },
      raw: true,
    });
    if (records.length === 0) return [];

    const rows = await this.valuesRepo.findAll({
      attributes: ['recordId', 'propertyId', 'text', 'number', 'json', 'optionId', 'domainIds', 'exceptDomainIds'],
      where: {
        // Весь список — подзапросом, а не перечнем в десятки тысяч номеров
        recordId:
          recordIds === null
            ? { [Op.in]: Sequelize.literal(`(SELECT id FROM infoblock_records WHERE "settingsId" = ${Number(settingsId)})`) }
            : records.map((record) => record.id),
        ...(propertyIds === null ? {} : { propertyId: propertyIds }),
      },
      order: [['sort', 'ASC']],
      raw: true,
    });
    const byRecord = new Map<number, PropertyValue[]>();
    for (const row of rows) {
      const own = byRecord.get(row.recordId);
      if (own) own.push(row);
      else byRecord.set(row.recordId, [row]);
    }

    return records
      .map((record) => {
        const stored = valuesMap(properties, byRecord.get(record.id) ?? []);
        const values = normalizeValues(properties, stored, false).values;
        return {
          recordId: record.recordKey,
          values: valueItems(properties, values),
          parentId: isTree ? record.parentId ?? null : null,
        };
      })
      .filter((row) => row.values.length > 0 || row.parentId !== null);
  }

  /**
   * Правка значений записи: меняется только то, что прислали. Свойства, которых
   * в теле нет, остаются как были — карточка и не обязана знать обо всех: часть
   * полей она ещё не умеет показывать, и присылать их «как есть», чтобы не
   * стереть, было бы нелепо. Чтобы стереть значение, его присылают как `null`.
   *
   * Присланное проверяется по настройкам списка — тип, обязательность,
   * варианты, — а ссылки на файлы, домены и записи ещё и на существование.
   */
  async save(
    userId: number,
    listKey: string,
    recordId: string,
    dto: UpdatePropertyValuesDto,
    author: HistoryAuthor,
  ): Promise<RecordValuesDto> {
    const list = resolveInfoblock(listKey);
    assertRecordId(recordId);

    return this.sequelize.transaction(async (transaction) => {
      const { properties, isTree } = await this.settingsService.settingsOf(
        list.key,
        transaction,
      );

      // Проверяем только присланное: обязательность у свойства, которого в теле
      // нет, ничего не значит — его значение осталось прежним
      const touched = touchedProperties(properties, dto.values ?? []);
      const integrationError = integrationOnlyError(touched, dto.externalId !== undefined, author);
      if (integrationError) throw new BadRequestException(integrationError);
      const { values, errors } = normalizeValues(
        touched,
        valuesByCode(properties, dto.values ?? []),
        true,
      );
      if (errors.length) throw new BadRequestException(errors.join('; '));
      await this.assertReferences(touched, values, transaction);

      // Настройки у списка есть всегда: не сохраняли — заводим пустые
      const settingsId = await this.settingsService.ensureSettingsId(list.key, transaction);

      const record = await this.recordsRepo.findOne({
        where: { settingsId, recordKey: recordId },
        transaction,
      });

      const beforeRows = record
        ? await this.valuesRepo.findAll({
            where: { recordId: record.id },
            order: [['sort', 'ASC']],
            transaction,
          })
        : [];
      const stored = valuesMap(properties, beforeRows);
      const before = normalizeValues(touched, stored, false).values;
      const beforeParent = record?.parentId ?? null;
      const beforeExternalId = record?.externalId ?? null;
      const externalId =
        dto.externalId === undefined ? beforeExternalId : await this.checkedExternalId(settingsId, recordId, dto.externalId, transaction);

      /**
       * Родителя трогаем, только если его прислали: у списка, где дерево своё
       * (страницы), он живёт в таблице раздела и приходит туда же, а сюда —
       * не приходит вовсе. Не будь этой проверки, «поле не присылали»
       * означало бы «перенести в корень».
       */
      const parentId =
        isTree && dto.parentId !== undefined
          ? await this.checkedParent(list.key, recordId, dto.parentId, transaction)
          : beforeParent;

      const saved =
        record ??
        (await this.recordsRepo.create({ settingsId, recordKey: recordId }, { transaction }));
      await saved.update({ parentId, externalId }, { transaction });

      // Переписываем только присланные свойства: у остальных строки не трогаем
      const touchedIds = touched.map((property) => property.id as number);
      if (touchedIds.length) {
        await this.valuesRepo.destroy({
          where: { recordId: saved.id, propertyId: touchedIds },
          transaction,
        });
      }
      const rows = valueRows(touched, values, saved.id);
      if (rows.length) await this.valuesRepo.bulkCreate(rows, { transaction });

      // «Изменено» у записи — и правка её свойств: время такой правки помнит
      // строка записи здесь, а страница записей берёт его, если оно позже
      // правки самой записи. Сохранили то же самое — времени не трогаем
      const isChanged =
        parentId !== beforeParent ||
        externalId !== beforeExternalId ||
        JSON.stringify(before) !== JSON.stringify(values);
      if (isChanged) {
        saved.changed('updatedAt', true);
        await saved.save({ transaction });
      }

      // Присланные свойства берём только из новых значений: стёртого (`null`)
      // среди них нет, а прежнее из `stored` вернуло бы его обратно
      const touchedCodes = new Set(touched.map((property) => property.code));
      const untouched = Object.fromEntries(
        Object.entries(stored).filter(([code]) => !touchedCodes.has(code)),
      );
      const after = normalizeValues(properties, { ...untouched, ...values }, false).values;
      await this.checks.get(list.kind)?.({
        recordId,
        touched: Array.from(touchedCodes),
        values: after,
        transaction,
      });

      // Внешний ID — в журнал, только если его присылали: иначе его там и не было
      const withExternal = (snapshot: Record<string, unknown>, value: string | null) =>
        dto.externalId === undefined ? snapshot : { ...snapshot, [EXTERNAL_ID_SNAPSHOT_KEY]: value };
      await this.recordHistory(
        userId,
        list,
        recordId,
        withExternal(snapshotOf(touched, before, isTree, beforeParent), beforeExternalId),
        withExternal(snapshotOf(touched, values, isTree, parentId), externalId),
        author,
        transaction,
      );

      // Родителя в ответе нет: им владеет раздел записи, а не её значения.
      // Значения отдаём все, а не только тронутые, — карточке нужен итог
      return {
        recordId,
        values: valueItems(properties, after),
      };
    });
  }

  /**
   * Стереть значения удалённых записей. Сама запись уже удалена своим разделом
   * и попала в его журнал вместе со снимком — отдельной строки здесь не нужно.
   * Вложенные в удалённую запись поднимаются к её родителю: их раздел не удалял.
   */
  async remove(
    listKey: string,
    recordIds: string[],
  ): Promise<RemovedPropertyValuesDto> {
    const { key } = resolveInfoblock(listKey);
    recordIds.forEach(assertRecordId);

    return this.sequelize.transaction(async (transaction) => {
      const settingsId = await this.settingsService.settingsId(key, transaction);
      // Настроек нет — и значений тоже: стирать нечего
      if (settingsId === null) return { removed: 0 };

      const records = await this.recordsRepo.findAll({ where: { settingsId }, transaction });
      const parents = new Map(records.map((row) => [row.recordKey, row.parentId ?? null]));

      const moved = reparentAfterRemove(recordIds, parents);
      for (const row of records) {
        if (moved.has(row.recordKey)) {
          await row.update({ parentId: moved.get(row.recordKey) ?? null }, { transaction });
        }
      }

      await this.draftsRepo.destroy({ where: { settingsId, recordKey: recordIds }, transaction });

      // Значения уйдут каскадом: они ссылаются на строку записи
      const removed = await this.recordsRepo.destroy({
        where: { settingsId, recordKey: recordIds },
        transaction,
      });
      return { removed };
    });
  }

  /**
   * Внешний ID записи: пустой — стереть, занятый другой записью списка — 409.
   * Уникальность держит и индекс базы; проверка здесь — ради понятного текста.
   */
  private async checkedExternalId(
    settingsId: number,
    recordId: string,
    raw: string | null,
    transaction: Transaction,
  ): Promise<string | null> {
    const externalId = raw?.trim() ?? '';
    if (externalId === '') return null;
    const taken = await this.recordsRepo.findOne({
      where: { settingsId, externalId, recordKey: { [Op.ne]: recordId } },
      attributes: ['recordKey'],
      transaction,
    });
    if (taken) throw new ConflictException(`Внешний ID «${externalId}» уже у записи #${taken.recordKey}`);
    return externalId;
  }

  /** Родитель записи: формат ключа и отсутствие кольца в дереве. */
  private async checkedParent(
    listKey: string,
    recordId: string,
    parentId: string | null,
    transaction: Transaction,
  ): Promise<string | null> {
    if (parentId === null || parentId === '') return null;
    assertRecordId(parentId);

    const settingsId = await this.settingsService.settingsId(listKey, transaction);
    const records = settingsId === null
      ? []
      : await this.recordsRepo.findAll({ where: { settingsId }, transaction });
    const parents = new Map(records.map((row) => [row.recordKey, row.parentId ?? null]));
    const invalid = parentError(recordId, parentId, parents);
    if (invalid) throw new BadRequestException(invalid);
    return parentId;
  }

  /**
   * В свойстве — только существующие файлы, домены и свои записи. Чужой номер вёл бы к чужому
   * файлу, когда сайт начнёт раскрывать ссылки.
   */
  private async assertReferences(
    properties: InfoblockPropertyDto[],
    grouped: PropertyValueMap,
    transaction: Transaction,
  ): Promise<void> {
    await this.assertDomains(properties, grouped, transaction);

    // Ссылки проверяются во всех группах доменов, а не только в общем значении
    const values = plainValues(properties, grouped);
    await this.assertFiles(properties, values, transaction);

    await this.linkTargets.assertExist(referencedLinks(properties, values), transaction);
  }

  /** Домены мультидоменных значений — существующие: на удалённый домен значение не повесить. */
  private async assertDomains(
    properties: InfoblockPropertyDto[],
    values: PropertyValueMap,
    transaction: Transaction,
  ): Promise<void> {
    const ids = referencedDomainIds(properties, values);
    if (ids.length === 0) return;
    const found = await this.domainRepo.count({ where: { id: ids }, transaction });
    if (found !== ids.length) throw new BadRequestException('Домен не найден');
  }

  /**
   * Удалённый домен — из всех мультидоменных значений: из групп и из
   * исключений. Группа, у которой доменов не осталось, уходит целиком: её
   * значение больше некому показывать. Зовёт раздел доменов, удаляя домен.
   */
  async forgetDomain(domainId: number): Promise<void> {
    await this.sequelize.transaction(async (transaction) => {
      const replacements = { domainId };
      await this.sequelize.query(
        `UPDATE infoblock_values SET "exceptDomainIds" = array_remove("exceptDomainIds", :domainId)
         WHERE :domainId = ANY("exceptDomainIds")`,
        { replacements, transaction },
      );
      await this.sequelize.query(
        `UPDATE infoblock_values SET "domainIds" = array_remove("domainIds", :domainId)
         WHERE :domainId = ANY("domainIds")`,
        { replacements, transaction },
      );
      await this.sequelize.query(`DELETE FROM infoblock_values WHERE "domainIds" = '{}'`, { transaction });
    });
  }

  /**
   * Файлы в значениях: существующие и подходящие под ограничения свойства — изображение
   * ли это, формат, вес. Проверяется здесь, а не при загрузке: файл выбирают
   * и из уже загруженных, и он мог лечь в раздел под другое свойство.
   * Разрешение картинки в карточке файла не хранится — его проверяет шторка.
   */
  private async assertFiles(
    properties: InfoblockPropertyDto[],
    values: PropertyValueMap,
    transaction: Transaction,
  ): Promise<void> {
    const fileTypes = [PropertyType.File, PropertyType.Image];
    const ids = referencedIds(properties, values, fileTypes);
    if (ids.length === 0) return;

    // Файлы общие на сайт: владельца у них нет, проверяем только, что файл есть
    const files = await this.fileRepo.findAll({ where: { id: ids }, transaction });
    if (files.length !== ids.length) throw new BadRequestException('Файл не найден');
    const fileById = new Map(files.map((file) => [file.id, file]));

    for (const property of properties) {
      if (!fileTypes.includes(property.type) || values[property.code] === undefined) continue;
      for (const id of referencedIds([property], values, fileTypes)) {
        const file = fileById.get(id);
        const error = file ? fileRuleError(property, file) : null;
        if (error) throw new BadRequestException(error);
      }
    }
  }

  /**
   * Правка свойств — в журнал раздела, под ключом самой записи: так она видна
   * во вкладке «История» рядом с правками остальных полей. Код и название записи
   * берутся из её последней строки в журнале — раздел их уже туда записал.
   */
  private async recordHistory(
    userId: number,
    list: ResolvedInfoblock,
    recordId: string,
    before: Record<string, unknown>,
    after: Record<string, unknown>,
    author: HistoryAuthor,
    transaction: Transaction,
  ): Promise<void> {
    if (!list.entity) return;

    const latest = await this.historyService.findLatest(list.entity, recordId);
    await this.historyService.record({
      userId,
      entity: list.entity,
      entityId: recordId,
      entityCode: latest?.entityCode ?? null,
      entityName: latest?.entityName ?? null,
      action: HistoryAction.Update,
      before,
      after,
      author,
      transaction,
    });
  }
}

/**
 * Что пишет только интеграция — внешнее API или MCP (у их правки есть `via`),
 * а из панели не правится: свойства «Внешний источник» и внешний ID записи.
 * Нарушено — текст ошибки, иначе null.
 */
export function integrationOnlyError(
  touched: Pick<InfoblockPropertyDto, 'name' | 'isExternal'>[],
  isExternalIdSent: boolean,
  author: Pick<HistoryAuthor, 'via'>,
): string | null {
  if (author.via) return null;
  if (isExternalIdSent) return 'Внешний ID задаёт только интеграция — через внешнее API или MCP';
  const external = touched.filter((property) => property.isExternal);
  if (external.length === 0) return null;
  return external
    .map((property) => `Свойство «${property.name}» заполняется из внешнего источника — в панели его не правят`)
    .join('; ');
}

/**
 * Свойства, которые прислали. Остальные в этой правке не участвуют: их не
 * проверяют, их строки не трогают и в журнал они не попадают.
 */
function touchedProperties(
  properties: InfoblockPropertyDto[],
  items: PropertyValueDto[],
): InfoblockPropertyDto[] {
  const sent = new Set(items.map((item) => item.propertyId));
  return properties.filter((property) => property.id !== undefined && sent.has(property.id));
}

/* --- значения между строками базы, кодами свойств и номерами наружу --- */

/** Строки значений записи — в привычную карту «код свойства → значение». */
export function valuesMap(
  properties: InfoblockPropertyDto[],
  rows: PropertyValue[],
): PropertyValueMap {
  const byId = new Map(properties.map((property) => [property.id, property]));
  const values: PropertyValueMap = {};

  const groupsByCode = new Map<string, Map<string, DomainGroup>>();

  for (const row of rows) {
    const property = byId.get(row.propertyId);
    if (!property) continue;
    const value = decode(property, row);
    if (value === null) continue;

    if (property.isMultiDomain) {
      // Строки одной группы — подряд по `sort`; группу узнаём по её доменам
      const groups = groupsByCode.get(property.code) ?? new Map<string, DomainGroup>();
      groupsByCode.set(property.code, groups);
      const key = JSON.stringify(row.domainIds ?? null);
      const group = groups.get(key) ?? {
        domainIds: row.domainIds ?? null,
        value: [],
        ...(row.domainIds ? {} : { exceptDomainIds: row.exceptDomainIds ?? [] }),
      };
      groups.set(key, group);
      (group.value as unknown[]).push(value);
      continue;
    }

    // Свойство перестало быть мультидоменным — уникальные значения доменов
    // не читаются, но и не стираются: включат флаг обратно — вернутся
    if (row.domainIds) continue;
    if (property.multiple === true) {
      const items = (values[property.code] as unknown[] | undefined) ?? [];
      items.push(value);
      values[property.code] = items;
    } else if (values[property.code] === undefined) {
      values[property.code] = value;
    }
  }

  for (const [code, groups] of groupsByCode) {
    const property = properties.find((item) => item.code === code);
    values[code] = Array.from(groups.values()).map((group) => ({
      ...group,
      value: property?.multiple ? group.value : (group.value as unknown[])[0],
    }));
  }
  return values;
}

/** Карта значений — в строки базы: у множественного свойства их несколько. */
export function valueRows(
  properties: InfoblockPropertyDto[],
  values: PropertyValueMap,
  recordId: number,
): ({
  recordId: number;
  propertyId: number;
  sort: number;
  domainIds: number[] | null;
  exceptDomainIds: number[] | null;
} & ValueColumns)[] {
  const rows = [];
  for (const property of properties) {
    const value = values[property.code];
    if (value === undefined || value === null || property.id === undefined) continue;
    const propertyId = property.id;

    // Группы мультидоменного — те же строки, только с доменами; `sort` сквозной
    const groups: DomainGroup[] = property.isMultiDomain
      ? (value as DomainGroup[])
      : [{ domainIds: null, value }];
    let sort = 0;
    for (const group of groups) {
      if (group.value === null) continue;
      const list =
        Array.isArray(group.value) && property.type !== PropertyType.Table ? group.value : [group.value];
      for (const item of list) {
        rows.push({
          recordId,
          propertyId,
          sort: sort++,
          domainIds: group.domainIds,
          exceptDomainIds: group.exceptDomainIds?.length ? group.exceptDomainIds : null,
          ...encode(property, item),
        });
      }
    }
  }
  return rows;
}

/** Карта значений — наружу, номерами свойств. Скрытых наружу нет совсем. */
function valueItems(
  properties: InfoblockPropertyDto[],
  values: PropertyValueMap,
): PropertyValueDto[] {
  return properties
    .filter(
      (property) =>
        property.id !== undefined && !property.isHidden && values[property.code] !== undefined,
    )
    .map((property) => ({ propertyId: property.id as number, value: values[property.code] }));
}

/** Тело запроса — во внутреннюю карту по кодам: проверки работают с ними. */
function valuesByCode(
  properties: InfoblockPropertyDto[],
  items: PropertyValueDto[],
): PropertyValueMap {
  const byId = new Map(properties.map((property) => [property.id, property]));
  const values: PropertyValueMap = {};
  for (const item of items) {
    const property = byId.get(item.propertyId);
    if (property) values[property.code] = item.value as PropertyValueMap[string];
  }
  return values;
}

/** Колонки строки под само значение: занята всегда одна, остальные пусты. */
interface ValueColumns {
  text: string | null;
  number: number | null;
  json: unknown;
  optionId: number | null;
}

const EMPTY_COLUMNS: ValueColumns = { text: null, number: null, json: null, optionId: null };

/**
 * Значение — в свою колонку. Числа, файлы и изображения в `number`, таблица
 * и привязка в `json`, вариант списка в `optionId`, остальное в `text`:
 * иначе по значению не отсортируешь.
 */
function encode(property: InfoblockPropertyDto, value: unknown): ValueColumns {
  switch (property.type) {
    case PropertyType.Number:
    case PropertyType.File:
    case PropertyType.Image:
      return { ...EMPTY_COLUMNS, number: Number(value) };

    case PropertyType.List:
    case PropertyType.ListOptionLink:
      return { ...EMPTY_COLUMNS, optionId: Number(value) };

    case PropertyType.Table:
    case PropertyType.ContentLink:
    case PropertyType.ContentTypeLink:
      return { ...EMPTY_COLUMNS, json: value };

    default:
      return { ...EMPTY_COLUMNS, text: String(value) };
  }
}

/** Колонка — обратно в значение того вида, которого ждёт свойство. */
function decode(property: InfoblockPropertyDto, row: PropertyValue): unknown {
  switch (property.type) {
    case PropertyType.Number:
    case PropertyType.File:
    case PropertyType.Image:
      return row.number ?? null;

    case PropertyType.List:
    case PropertyType.ListOptionLink:
      return row.optionId ?? null;

    case PropertyType.Table:
    case PropertyType.ContentLink:
    case PropertyType.ContentTypeLink:
      return row.json ?? null;

    default:
      return row.text ?? null;
  }
}

/**
 * Снимок записи для журнала: свойства и родитель — плоскими ключами. Скрытое
 * значение журнал не хранит — только отметку, что оно есть.
 */
function snapshotOf(
  properties: InfoblockPropertyDto[],
  values: PropertyValueMap,
  isTree: boolean,
  parentId: string | null,
): Record<string, unknown> {
  const hidden = new Set(properties.filter((property) => property.isHidden).map((property) => property.code));
  const snapshot = valuesSnapshot(
    Object.fromEntries(
      Object.entries(values).map(([code, value]) => [
        code,
        hidden.has(code) && value !== null ? HIDDEN_SNAPSHOT_VALUE : value,
      ]),
    ) as PropertyValueMap,
  );
  if (isTree) snapshot[PARENT_SNAPSHOT_KEY] = parentId;
  return snapshot;
}
