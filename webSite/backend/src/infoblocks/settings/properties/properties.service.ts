import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnApplicationBootstrap,
  forwardRef,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { QueryTypes, Transaction, UniqueConstraintError } from 'sequelize';
import { hasProperties, listDefaultName, resolveInfoblock } from '../infoblock-kinds';
import { InfoblockSettings, SITE_OWNER } from '../settings.model';
import { OptionSourceDto } from './option-source.dto';
import { InfoblockSettingsService } from '../settings.service';
import { InfoblockTab } from '../tabs/tab.model';
import { InfoblockPropertyDto } from './property.dto';
import { UpdateInfoblockPropertyDto } from './update-property.dto';
import {
  PropertyDef,
  PropertyOption,
  PropertyType,
  canChangeType,
  normalizeProperties,
  paramsOf,
  propertiesError,
  tabsError,
} from './property';
import { InfoblockPropertyOption } from './property-option.model';
import { InfoblockProperty } from './property.model';
import { systemPropertiesOf } from './system-properties';

/** Шаг порядка: между соседними свойствами всегда есть куда вписать новое. */
const POSITION_STEP = 10;

/**
 * Типы, которых больше нет: свойства таких типов удаляются при старте сервера
 * вместе со значениями (`ON DELETE CASCADE`). «HTML-блоки» ушли вместе с разделом.
 */
const RETIRED_TYPES = ['html-blocks'];

/**
 * Свойства записей списка. Живут отдельно от настроек: их читают и сохраняют
 * своим запросом, а настройки списка (имя, код, правила записей) — своим.
 *
 * Сохранение — разбор присланного списка на «добавить / изменить / убрать»:
 * так у знакомого свойства остаётся номер, а у записей — их значения.
 */
@Injectable()
export class InfoblockPropertiesService implements OnApplicationBootstrap {
  private readonly logger = new Logger(InfoblockPropertiesService.name);

  constructor(
    @InjectModel(InfoblockProperty) private readonly propertiesRepo: typeof InfoblockProperty,
    @InjectModel(InfoblockPropertyOption)
    private readonly optionsRepo: typeof InfoblockPropertyOption,
    @InjectModel(InfoblockSettings) private readonly settingsRepo: typeof InfoblockSettings,
    @InjectModel(InfoblockTab) private readonly tabsRepo: typeof InfoblockTab,
    @Inject(forwardRef(() => InfoblockSettingsService))
    private readonly settingsService: InfoblockSettingsService,
    @InjectConnection() private readonly sequelize: Sequelize,
  ) {}

  /** Свойства убранных типов — прочь: показать и сохранить их всё равно нечем. */
  async onApplicationBootstrap(): Promise<void> {
    const removed = await this.propertiesRepo.destroy({ where: { type: RETIRED_TYPES } });
    if (removed) this.logger.log(`Удалены свойства убранных типов: ${removed}`);
  }

  /**
   * Свойства списка в порядке показа; нет настроек — нет и свойств. Кроме
   * списков с системными свойствами: у них настройки заводятся при первом же
   * чтении — карточка должна показать системное свойство и новому списку.
   */
  async findAll(
    listKey: string,
    transaction?: Transaction,
  ): Promise<InfoblockPropertyDto[]> {
    const settingsId = systemPropertiesOf(resolveInfoblock(listKey).kind).length
      ? await this.settingsService.ensureSettingsId(listKey, transaction)
      : await this.settingsService.settingsId(listKey, transaction);
    if (settingsId === null) return [];

    const order = [['position', 'ASC'], ['id', 'ASC']] as [string, string][];
    const rows = await this.propertiesRepo.findAll({ where: { settingsId }, order, transaction });

    const [tabRows, optionsByProperty, filled] = await Promise.all([
      this.tabsRepo.findAll({ where: { settingsId }, transaction }),
      this.optionsOf(rows.map((row) => row.id), transaction),
      this.filledOf(rows.map((row) => row.id), transaction),
    ]);
    const tabCodeById = new Map(tabRows.map((tab) => [tab.id, tab.code]));

    // Нормализуем: у настроек прежних версий могло не быть новых параметров.
    // По одному, а не списком: свойство незнакомого типа нормализация
    // отбрасывает, и номера соседей съехали бы на чужие строки
    const defs = rows.flatMap((row) => {
      const [def] = normalizeProperties([
        {
          code: row.code,
          name: row.name,
          hint: row.hint,
          type: row.type,
          tab: row.tabId === null ? '' : tabCodeById.get(row.tabId) ?? '',
          required: row.required,
          multiple: row.multiple,
          isMultiDomain: row.isMultiDomain,
          isHidden: row.isHidden,
          isExternal: row.isExternal,
          ...(row.params ?? {}),
          options: optionsByProperty.get(row.id) ?? [],
        },
      ]);
      // Номер, порядок, системность и заполненность нормализация не знает — возвращаем их рядом
      return def
        ? [
            {
              ...def,
              id: row.id,
              position: row.position,
              isBlocked: row.isBlocked,
              isFilled: filled.has(row.id),
            },
          ]
        : [];
    });
    return this.withSourceOptions(defs, transaction);
  }

  /**
   * Свойства-«Списки», на варианты которых может смотреть привязка к значениям
   * списка: из всех списков сайта.
   */
  async findOptionSources(): Promise<OptionSourceDto[]> {
    const lists = (await this.settingsRepo.findAll({ where: { userId: SITE_OWNER } })).filter(isLiveList);
    if (lists.length === 0) return [];
    const listById = new Map(lists.map((settings) => [settings.id, settings]));
    const rows = await this.propertiesRepo.findAll({
      where: { settingsId: lists.map((settings) => settings.id), type: PropertyType.List },
      order: [['position', 'ASC'], ['id', 'ASC']],
    });
    return rows
      .map((row) => {
        const list = listById.get(row.settingsId)!;
        return {
          propertyId: row.id,
          name: row.name,
          listKey: list.listKey,
          listName: list.name || listDefaultName(list.listKey),
        };
      })
      .sort((a, b) => a.listName.localeCompare(b.listName, 'ru'));
  }

  /**
   * Новое свойство. Пишется одной строкой: остальные свойства списка остаются
   * как есть — их никто не присылал и трогать их незачем.
   *
   * Файлу и изображению сразу заводится раздел в «Файлах»: туда ляжет всё,
   * что загрузят через это свойство в карточке записи.
   */
  async create(
    listKey: string,
    dto: InfoblockPropertyDto,
  ): Promise<InfoblockPropertyDto> {
    if (!hasProperties(listKey)) {
      throw new BadRequestException('У записей этого списка свойств не бывает');
    }
    return this.sequelize.transaction(async (transaction) => {
      const settingsId = await this.settingsService.ensureSettingsId(listKey, transaction);
      const property = this.checked(dto);
      await this.assertOptionsSource(property, null, transaction);

      const tabId = await this.tabIdOf(settingsId, property.tab, transaction);
      const position =
        dto.position ??
        (await this.nextPosition(settingsId, transaction));

      try {
        const row = await this.propertiesRepo.create(
          {
            settingsId,
            code: property.code,
            name: property.name,
            hint: property.hint,
            type: property.type,
            tabId,
            required: property.required,
            multiple: property.multiple,
            isMultiDomain: property.isMultiDomain,
            isHidden: property.isHidden,
            isExternal: property.isExternal,
            position,
            params: paramsOf(property),
          },
          { transaction },
        );
        const options = await this.saveOptions(row.id, property.options, transaction);

        const [saved] = await this.withSourceOptions(
          [{ ...property, options, id: row.id, position, isFilled: false }],
          transaction,
        );
        return saved;
      } catch (error) {
        if (error instanceof UniqueConstraintError) {
          throw new ConflictException(`Свойство с кодом «${property.code}» уже есть`);
        }
        throw error;
      }
    });
  }

  /**
   * Правка одного свойства. Значения записей привязаны к номеру свойства,
   * поэтому код меняется без потерь. Тип — только пока менять его безопасно
   * (`canChangeType`): у незаполненного свойства на любой, у заполненного —
   * между строкой, текстом и HTML.
   */
  async update(
    listKey: string,
    id: number,
    dto: UpdateInfoblockPropertyDto,
  ): Promise<InfoblockPropertyDto> {
    return this.sequelize.transaction(async (transaction) => {
      const row = await this.findOwn(listKey, id, transaction);
      assertNotSystem(row);
      const before = await this.defOf(row, transaction);

      // Значения записей лежат так, как их понимает тип («12 шт.» числом
      // не станет): подменой типа их обесценили бы. Поэтому заполненному
      // свойству тип меняют только там, где значение читается одинаково
      const isFilled = (await this.filledOf([row.id], transaction)).has(row.id);
      const type = dto.type ?? before.type;
      if (!canChangeType(before.type, type, isFilled)) {
        throw new ConflictException(
          'Свойство уже заполнено у записей: его тип меняется только между строкой, текстом и HTML. ' +
            'Нужен другой — заведите новое свойство',
        );
      }

      const property = this.checked({ ...before, ...dto, type } as InfoblockPropertyDto);
      await this.assertOptionsSource(property, row.id, transaction);
      // Перестал быть «Списком» — его варианты уйдут, а на них может смотреть привязка
      if (before.type === PropertyType.List && property.type !== PropertyType.List) {
        await this.assertNotOptionsSource(row.id, transaction);
      }

      const tabId = await this.tabIdOf(row.settingsId, property.tab, transaction);

      try {
        await row.update(
          {
            code: property.code,
            name: property.name,
            hint: property.hint,
            type: property.type,
            tabId,
            required: property.required,
            multiple: property.multiple,
            isMultiDomain: property.isMultiDomain,
            isHidden: property.isHidden,
            isExternal: property.isExternal,
            position: dto.position ?? row.position,
            params: paramsOf(property),
          },
          { transaction },
        );
      } catch (error) {
        if (error instanceof UniqueConstraintError) {
          throw new ConflictException(`Свойство с кодом «${property.code}» уже есть`);
        }
        throw error;
      }

      // Ушёл из «Списка» — варианты уходят следом: нормализация их уже обнулила
      const options = await this.saveOptions(row.id, property.options, transaction);

      // Значения трогать не надо: они привязаны к номеру свойства, а не к коду.
      // Сменили код — на сайте поле станет другим ключом, но содержимое уцелеет
      const [saved] = await this.withSourceOptions(
        [{ ...property, options, id: row.id, position: row.position, isFilled }],
        transaction,
      );
      return saved;
    });
  }

  /**
   * Удаление свойства уносит и его значения у записей: читать их больше нечем.
   * Уносит каскадом — строки значений ссылаются на свойство внешним ключом.
   *
   * Файлы, загруженные через свойство, остаются: «Файлы» показывают их
   * в разделе удалённого свойства, оттуда их и удаляют.
   */
  async remove(listKey: string, id: number): Promise<void> {
    await this.sequelize.transaction(async (transaction) => {
      const row = await this.findOwn(listKey, id, transaction);
      assertNotSystem(row);
      await this.assertNotOptionsSource(row.id, transaction);
      await row.destroy({ transaction });
    });
  }

  /** Свойство этого списка; свойство другого списка не отдаём. */
  private async findOwn(
    listKey: string,
    id: number,
    transaction: Transaction,
  ): Promise<InfoblockProperty> {
    const settingsId = await this.settingsService.settingsId(listKey, transaction);
    const row = settingsId === null
      ? null
      : await this.propertiesRepo.findOne({ where: { settingsId, id }, transaction });
    if (!row) throw new NotFoundException('Свойство не найдено');
    return row;
  }

  /** Свойство строкой — в нормализованный вид, с вариантами и кодом вкладки. */
  private async defOf(row: InfoblockProperty, transaction: Transaction): Promise<PropertyDef> {
    const [tab, options] = await Promise.all([
      row.tabId === null
        ? Promise.resolve(null)
        : this.tabsRepo.findOne({ where: { id: row.tabId }, transaction }),
      this.optionsOf([row.id], transaction),
    ]);

    return normalizeProperties([
      {
        code: row.code,
        name: row.name,
        hint: row.hint,
        type: row.type,
        tab: tab?.code ?? '',
        required: row.required,
        multiple: row.multiple,
        isMultiDomain: row.isMultiDomain,
        isHidden: row.isHidden,
        isExternal: row.isExternal,
        ...(row.params ?? {}),
        options: options.get(row.id) ?? [],
      },
    ])[0];
  }

  /** Описание свойства из запроса: нормализуем и проверяем. */
  private checked(dto: InfoblockPropertyDto): PropertyDef {
    const property = normalizeProperties([dto as Partial<PropertyDef>])[0];
    if (!property) throw new BadRequestException('Свойство без кода или названия');

    const invalid = propertiesError([property]);
    if (invalid) throw new BadRequestException(invalid);
    return property;
  }

  /** Номер вкладки по коду; пустой код — общая вкладка «Свойства». */
  private async tabIdOf(
    settingsId: number,
    code: string,
    transaction: Transaction,
  ): Promise<number | null> {
    if (!code) return null;
    const tab = await this.tabsRepo.findOne({ where: { settingsId, code }, transaction });
    if (!tab) throw new BadRequestException(`Вкладка «${code}» не найдена`);
    return tab.id;
  }

  /** Порядок нового свойства — за самым дальним в списке. */
  private async nextPosition(settingsId: number, transaction: Transaction): Promise<number> {
    const rows = await this.propertiesRepo.findAll({ where: { settingsId }, transaction });
    return rows.reduce((max, row) => Math.max(max, row.position), 0) + POSITION_STEP;
  }

  /**
   * Варианты «Списка»: знакомые правим, новые заводим, пропавшие убираем.
   * Значение записи хранит номер варианта, поэтому вариант узнаётся по номеру:
   * код и название ему можно менять, выбранное у записей останется. Номер
   * чужого свойства здесь не найдётся — такой вариант заводится заново.
   *
   * Возвращает варианты с номерами: шторке они нужны к следующему сохранению.
   */
  private async saveOptions(
    propertyId: number,
    options: PropertyOption[],
    transaction: Transaction,
  ): Promise<PropertyOption[]> {
    const rows = await this.optionsRepo.findAll({ where: { propertyId }, transaction });
    const kept = new Set(options.map((option) => option.id));

    for (const row of rows) {
      if (!kept.has(row.id)) await row.destroy({ transaction });
    }

    // Код уникален внутри свойства, а двум вариантам могли обменять коды:
    // сначала меняемым даём временный код, иначе первый же обмен упрётся в индекс
    const rowById = new Map(rows.filter((row) => kept.has(row.id)).map((row) => [row.id, row]));
    for (const option of options) {
      const row = option.id === undefined ? undefined : rowById.get(option.id);
      if (row && row.code !== option.code) await row.update({ code: `#${row.id}` }, { transaction });
    }

    const saved: PropertyOption[] = [];
    for (const [index, option] of options.entries()) {
      const position = (index + 1) * POSITION_STEP;
      const fields = { code: option.code, name: option.name, position };
      const row = option.id === undefined ? undefined : rowById.get(option.id);
      const result = row
        ? await row.update(fields, { transaction })
        : await this.optionsRepo.create({ propertyId, ...fields }, { transaction });
      saved.push({ id: result.id, code: result.code, name: result.name });
    }
    return saved;
  }

  /**
   * Привязке к значениям списка — варианты свойства, на которое она смотрит:
   * своих у неё нет, а выбирают и проверяют значения по ним, как у «Списка».
   */
  private async withSourceOptions<T extends PropertyDef>(
    properties: T[],
    transaction?: Transaction,
  ): Promise<T[]> {
    const sourceIds = properties
      .filter((property) => property.type === PropertyType.ListOptionLink)
      .flatMap((property) => (property.optionsPropertyId === null ? [] : [property.optionsPropertyId]));
    if (sourceIds.length === 0) return properties;
    const optionsBySource = await this.optionsOf(Array.from(new Set(sourceIds)), transaction);
    return properties.map((property) =>
      property.type === PropertyType.ListOptionLink && property.optionsPropertyId !== null
        ? { ...property, options: optionsBySource.get(property.optionsPropertyId) ?? [] }
        : property,
    );
  }

  /**
   * Привязка к значениям списка смотрит на существующее свойство-«Список»
   * из доступного пользователю списка — и не на саму себя.
   */
  private async assertOptionsSource(
    property: PropertyDef,
    selfId: number | null,
    transaction: Transaction,
  ): Promise<void> {
    if (property.type !== PropertyType.ListOptionLink || property.optionsPropertyId === null) return;
    const source = await this.propertiesRepo.findOne({
      where: { id: property.optionsPropertyId },
      transaction,
    });
    const settings = source
      ? await this.settingsRepo.findOne({ where: { id: source.settingsId }, transaction })
      : null;
    if (
      !source ||
      !settings ||
      source.id === selfId ||
      source.type !== PropertyType.List ||
      !isLiveList(settings)
    ) {
      throw new BadRequestException('Свойство-список для привязки не найдено');
    }
  }

  /**
   * На варианты «Списка» может смотреть привязка к значениям списка: удалить
   * его или сменить ему тип значило бы молча оставить её без вариантов.
   */
  private async assertNotOptionsSource(propertyId: number, transaction: Transaction): Promise<void> {
    const user = await this.propertiesRepo.findOne({
      where: { type: PropertyType.ListOptionLink, params: { optionsPropertyId: propertyId } },
      transaction,
    });
    if (user) {
      throw new ConflictException(
        `На варианты этого списка смотрит привязка «${user.name}» — сначала смените её или удалите`,
      );
    }
  }

  /**
   * Номера свойств, у которых есть значение хотя бы у одной записи. Через
   * `EXISTS` по индексу — по строке на свойство: свойства читает каждое
   * сохранение значений, и перебор всех значений списка (`GROUP BY`) рос бы
   * вместе со списком.
   */
  private async filledOf(propertyIds: number[], transaction?: Transaction): Promise<Set<number>> {
    if (propertyIds.length === 0) return new Set();
    const rows = await this.sequelize.query<{ id: number }>(
      `SELECT p.id FROM unnest(ARRAY[:propertyIds]::int[]) AS p(id)
       WHERE EXISTS (SELECT 1 FROM infoblock_values v WHERE v."propertyId" = p.id)`,
      { replacements: { propertyIds }, type: QueryTypes.SELECT, transaction },
    );
    return new Set(rows.map((row) => row.id));
  }

  /** Варианты «Списка» по номерам свойств: номер свойства → его варианты по порядку. */
  private async optionsOf(
    propertyIds: number[],
    transaction?: Transaction,
  ): Promise<Map<number, PropertyOption[]>> {
    const byProperty = new Map<number, PropertyOption[]>();
    if (propertyIds.length === 0) return byProperty;

    const rows = await this.optionsRepo.findAll({
      where: { propertyId: propertyIds },
      order: [['position', 'ASC'], ['id', 'ASC']],
      transaction,
    });

    for (const row of rows) {
      const options = byProperty.get(row.propertyId) ?? [];
      options.push({ id: row.id, code: row.code, name: row.name });
      byProperty.set(row.propertyId, options);
    }
    return byProperty;
  }
}

/**
 * Системное свойство заводит и выравнивает сам сервер (`system-properties.ts`):
 * на нём держится что-то вне списка, и правка через API его бы сломала.
 */
function assertNotSystem(row: InfoblockProperty): void {
  if (row.isBlocked) {
    throw new ConflictException('Системное свойство не меняется и не удаляется');
  }
}

const omit = (values: Record<string, unknown>, codes: string[]): Record<string, unknown> =>
  Object.fromEntries(Object.entries(values).filter(([code]) => !codes.includes(code)));

/** Настройки списка, который панель знает: отложенные в `to_delete/` лежат в базе, но не читаются. */
function isLiveList(settings: InfoblockSettings): boolean {
  try {
    resolveInfoblock(settings.listKey);
    return settings.userId === SITE_OWNER;
  } catch {
    return false;
  }
}
