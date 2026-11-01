import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/sequelize';
import { Model, ModelCtor, Sequelize } from 'sequelize-typescript';
import { Op, Transaction, WhereOptions } from 'sequelize';
import { Users } from '../../users/users.model';
import { CONTENT_ITEMS_KIND } from '../contents/content-lists';
import { Contents } from '../contents/contents.model';
import { ContentItems } from '../contents/items/content-items.model';
import { InfoblockDraft } from '../drafts/draft.model';
import { Files } from '../files/files.model';
import { HistoryAuthor } from '../history/history.service';
import { Pages } from '../pages/pages.model';
import { ProductCategories } from '../products/categories/product-categories.model';
import { CATEGORIES_LIST, PRODUCTS_LIST } from '../products/product-lists';
import { Products } from '../products/products.model';
import { RecordsService } from '../records/records.service';
import { Roles } from '../roles/roles.model';
import { InfoblockFilter } from '../settings/filters/filter.model';
import { resolveInfoblock } from '../settings/infoblock-kinds';
import { PropertyType } from '../settings/properties/property';
import { InfoblockPropertyOption } from '../settings/properties/property-option.model';
import { InfoblockProperty } from '../settings/properties/property.model';
import { InfoblockSettings } from '../settings/settings.model';
import { InfoblockSettingsService } from '../settings/settings.service';
import { InfoblockTab } from '../settings/tabs/tab.model';
import { PropertyValue } from '../values/property-values.model';
import { InfoblockRecord } from '../values/record.model';
import {
  BACKUP_VERSION,
  changedCount,
  orphanIds,
  parseBackupData,
  planRecords,
  recordPrints,
  type BackupData,
  type BackupRow,
} from './backup-data';
import { BackupKind, InfoblockBackup } from './backup.model';
import {
  BackupCheckDto,
  BackupDto,
  RestoreBackupDto,
  RestoreMode,
} from './dto/backup.dto';

/** Таблица раздела и строки в ней, которые и есть этот список. */
interface BackupSource {
  model: ModelCtor<Model>;
  scope: (owner: number) => WhereOptions;
}

/** Копии «перед восстановлением» живут столько, а свои — пока их не удалят. */
const BEFORE_RESTORE_DAYS = 30;

/** Строки базы — в обычный JSON: даты строками, как они лягут в копию. */
const plainRows = (rows: unknown[]): BackupRow[] =>
  JSON.parse(JSON.stringify(rows)) as BackupRow[];

const ids = (rows: BackupRow[]): number[] => rows.map((row) => Number(row.id));

/** «Не из этих номеров»; пустой список — значит все. `NOT IN ()` Sequelize пишет как `NOT IN (NULL)` и не находит ничего. */
const notIn = <T>(field: string, values: T[]): WhereOptions =>
  values.length === 0 ? {} : { [field]: { [Op.notIn]: values } };

/**
 * Резервные копии списка: снимок настроек и записей, проверка «что изменится»
 * и возврат копии. Работает со строками таблиц напрямую, мимо сервисов
 * разделов: копия — уже проверенное когда-то состояние списка, и её
 * возвращают целиком, а не правкой по записи.
 *
 * Номера строк, которые видны или на которые ссылаются (записи раздела,
 * свойства, варианты, вкладки), копия сохраняет. Поэтому перед записью
 * проверяется, что под этими номерами нет строк другого списка: файл копии
 * могли подложить, а элементы всех типов контента лежат в одной таблице.
 */
@Injectable()
export class BackupsService {
  /** Вид списка → его записи. Нового вида здесь нет — копий у него нет (400). */
  private readonly sources: Record<string, BackupSource>;

  constructor(
    @InjectModel(InfoblockBackup)
    private readonly backupsRepo: typeof InfoblockBackup,
    @InjectModel(InfoblockSettings)
    private readonly settingsRepo: typeof InfoblockSettings,
    @InjectModel(InfoblockTab) private readonly tabsRepo: typeof InfoblockTab,
    @InjectModel(InfoblockProperty)
    private readonly propertiesRepo: typeof InfoblockProperty,
    @InjectModel(InfoblockPropertyOption)
    private readonly optionsRepo: typeof InfoblockPropertyOption,
    @InjectModel(InfoblockFilter)
    private readonly filtersRepo: typeof InfoblockFilter,
    @InjectModel(InfoblockRecord)
    private readonly recordsRepo: typeof InfoblockRecord,
    @InjectModel(PropertyValue)
    private readonly valuesRepo: typeof PropertyValue,
    @InjectModel(InfoblockDraft)
    private readonly draftsRepo: typeof InfoblockDraft,
    @InjectModel(Files) private readonly filesRepo: typeof Files,
    @InjectModel(Contents) private readonly contentsRepo: typeof Contents,
    @InjectModel(Pages) pages: typeof Pages,
    @InjectModel(Users) users: typeof Users,
    @InjectModel(Roles) roles: typeof Roles,
    @InjectModel(Products) products: typeof Products,
    @InjectModel(ProductCategories) categories: typeof ProductCategories,
    @InjectModel(ContentItems) contentItems: typeof ContentItems,
    @InjectConnection() private readonly sequelize: Sequelize,
    private readonly settings: InfoblockSettingsService,
    private readonly records: RecordsService,
  ) {
    // Записи общие на сайт: список — вся таблица, а у элементов — строки своего типа
    const all = () => ({});
    this.sources = {
      pages: { model: pages, scope: all },
      users: { model: users, scope: all },
      roles: { model: roles, scope: all },
      [PRODUCTS_LIST]: { model: products, scope: all },
      [CATEGORIES_LIST]: { model: categories, scope: all },
      [CONTENT_ITEMS_KIND]: {
        model: contentItems,
        scope: (contentId) => ({ contentId }),
      },
    };
  }

  async findAll(listKey: string): Promise<BackupDto[]> {
    await this.source(listKey);
    const settingsId = await this.settings.settingsId(listKey);
    if (settingsId === null) return [];
    const backups = await this.backupsRepo.findAll({
      attributes: { exclude: ['data'] },
      where: { settingsId },
      order: [['createdAt', 'DESC']],
    });
    return backups.map(BackupDto.from);
  }

  async create(
    listKey: string,
    note: string,
    author: HistoryAuthor,
  ): Promise<BackupDto> {
    const backup = await this.sequelize.transaction(async (transaction) =>
      this.save(
        listKey,
        BackupKind.Manual,
        note,
        await this.snapshot(listKey, transaction),
        author,
        transaction,
      ),
    );
    return BackupDto.from(backup);
  }

  async upload(
    listKey: string,
    note: string,
    raw: unknown,
    author: HistoryAuthor,
  ): Promise<BackupDto> {
    await this.source(listKey);
    const data = parseBackupData(raw, resolveInfoblock(listKey).key);
    const backup = await this.sequelize.transaction((transaction) =>
      this.save(
        listKey,
        BackupKind.Upload,
        note,
        data,
        author,
        transaction,
      ),
    );
    return BackupDto.from(backup);
  }

  /** Копия целиком — файлом: тем же форматом её потом загружают обратно. */
  async file(listKey: string, id: number): Promise<BackupData> {
    return (await this.getOwn(listKey, id)).data;
  }

  async remove(listKey: string, id: number): Promise<void> {
    await (await this.getOwn(listKey, id)).destroy();
  }

  /** Что станет со списком, если вернуть копию: для окна восстановления. */
  async check(
    listKey: string,
    id: number,
  ): Promise<BackupCheckDto> {
    const { data: copy } = await this.getOwn(listKey, id);
    const current = await this.snapshot(listKey);
    const plan = planRecords(
      await this.records.rows(listKey),
      copy.rows,
    );

    const copyPropertyIds = new Set(ids(copy.properties));
    const fileProperties = new Set(
      copy.properties
        .filter(
          (row) =>
            row.type === PropertyType.File || row.type === PropertyType.Image,
        )
        .map((row) => Number(row.id)),
    );
    const fileIds = copy.values
      .filter(
        (value) =>
          fileProperties.has(Number(value.propertyId)) && value.number !== null,
      )
      .map((value) => Number(value.number));
    const existingFiles = fileIds.length
      ? new Set(
          (
            await this.filesRepo.findAll({
              attributes: ['id'],
              where: { id: fileIds },
            })
          ).map((file) => file.id),
        )
      : new Set<number>();

    return {
      records: { current: current.rows.length, copy: copy.rows.length },
      properties: {
        current: current.properties.length,
        copy: copy.properties.length,
      },
      removedRecords: plan.removed.length,
      keptRecords: plan.kept.length,
      returnedRecords: plan.returned.length,
      changedRecords: changedCount(
        recordPrints(current.rows, current.records, current.values),
        recordPrints(copy.rows, copy.records, copy.values),
      ),
      removedProperties: current.properties
        .filter((row) => !copyPropertyIds.has(Number(row.id)))
        .map((row) => String(row.name)),
      missingFiles: fileIds.filter((fileId) => !existingFiles.has(fileId))
        .length,
    };
  }

  /**
   * Вернуть копию. Сначала снимается копия того, что есть сейчас, — так
   * восстановление можно отменить, вернув её. Всё в одной транзакции:
   * упало на середине — список остаётся прежним.
   */
  async restore(
    listKey: string,
    id: number,
    dto: RestoreBackupDto,
    author: HistoryAuthor,
  ): Promise<BackupDto> {
    const isSettings = dto.isSettings && dto.mode === RestoreMode.Replace;
    if (!dto.isRecords && !isSettings) {
      throw new BadRequestException('Выберите, что вернуть из копии');
    }
    const { data: copy } = await this.getOwn(listKey, id);
    const { key } = resolveInfoblock(listKey);
    const owner = Number(key.split('.')[1] ?? 0);
    const source = await this.source(listKey);
    const scope = source.scope(owner);
    // Защищённые записи раздел знает сам — их не удаляет и восстановление
    const current = await this.records.rows(key);

    const before = await this.sequelize.transaction(async (transaction) => {
      const saved = await this.save(
        key,
        BackupKind.BeforeRestore,
        '',
        await this.snapshot(key, transaction),
        author,
        transaction,
      );
      const settingsId = await this.settings.ensureSettingsId(
        key,
        transaction,
      );

      if (isSettings) await this.restoreSettings(settingsId, copy, transaction);
      if (dto.isRecords) {
        await this.restoreRows(
          source,
          scope,
          current,
          copy,
          dto.mode,
          transaction,
        );
        await this.restoreRecords(
          settingsId,
          current,
          copy,
          dto.mode,
          transaction,
        );
      }
      return saved;
    });
    return BackupDto.from(before);
  }

  /** Снимок списка как есть: настройки, записи раздела, значения, черновики. */
  private async snapshot(
    listKey: string,
    transaction?: Transaction,
  ): Promise<BackupData> {
    const { key } = resolveInfoblock(listKey);
    const owner = Number(key.split('.')[1] ?? 0);
    const source = await this.source(key);
    const settingsId = await this.settings.ensureSettingsId(
      key,
      transaction,
    );
    const settings = await this.settingsRepo.findByPk(settingsId, {
      transaction,
    });
    const raw = { raw: true, transaction };

    const [tabs, properties, filters, rows, records, drafts] =
      await Promise.all([
        this.tabsRepo.findAll({ where: { settingsId }, ...raw }),
        this.propertiesRepo.findAll({ where: { settingsId }, ...raw }),
        this.filtersRepo.findAll({ where: { settingsId }, ...raw }),
        source.model.findAll({
          where: source.scope(owner),
          order: [['id', 'ASC']],
          ...raw,
        }),
        this.recordsRepo.findAll({ where: { settingsId }, ...raw }),
        this.draftsRepo.findAll({ where: { settingsId }, ...raw }),
      ]);
    const [options, values] = await Promise.all([
      this.optionsRepo.findAll({
        where: { propertyId: properties.map((row) => row.id) },
        ...raw,
      }),
      this.valuesRepo.findAll({
        where: { recordId: records.map((row) => row.id) },
        ...raw,
      }),
    ]);

    return {
      version: BACKUP_VERSION,
      listKey: key,
      settings: {
        useCode: settings?.useCode ?? true,
        codeRequired: settings?.codeRequired ?? false,
        codeUnique: settings?.codeUnique ?? false,
        maxDepth: settings?.maxDepth ?? null,
        isHistoryEnabled: settings?.isHistoryEnabled ?? true,
        isDraftEnabled: settings?.isDraftEnabled ?? false,
      },
      tabs: plainRows(tabs),
      properties: plainRows(properties),
      options: plainRows(options),
      filters: plainRows(filters),
      rows: plainRows(rows),
      records: plainRows(records),
      values: plainRows(values),
      drafts: plainRows(drafts),
    };
  }

  private async save(
    listKey: string,
    kind: BackupKind,
    note: string,
    data: BackupData,
    author: HistoryAuthor,
    transaction: Transaction,
  ): Promise<InfoblockBackup> {
    const settingsId = await this.settings.ensureSettingsId(
      listKey,
      transaction,
    );
    // Копии «перед восстановлением» копятся с каждым восстановлением — старые уходят сами
    await this.backupsRepo.destroy({
      where: {
        settingsId,
        kind: BackupKind.BeforeRestore,
        createdAt: {
          [Op.lt]: new Date(
            Date.now() - BEFORE_RESTORE_DAYS * 24 * 60 * 60 * 1000,
          ),
        },
      },
      transaction,
    });
    return this.backupsRepo.create(
      {
        settingsId,
        listKey: data.listKey,
        kind,
        note: note.trim(),
        recordsCount: data.rows.length,
        propertiesCount: data.properties.length,
        size: Buffer.byteLength(JSON.stringify(data)),
        authorId: author.id,
        authorEmail: author.email,
        data,
      },
      { transaction },
    );
  }

  /**
   * Настройки списка — ровно как в копии: правила записей, вкладки, свойства
   * с вариантами, поля фильтра. Чего в копии нет, удаляется (свойство — вместе
   * со значениями, каскадом). Имя и код списка не трогаются: их задаёт раздел.
   */
  private async restoreSettings(
    settingsId: number,
    copy: BackupData,
    transaction: Transaction,
  ): Promise<void> {
    const propertyIds = ids(copy.properties);
    await this.assertOwn(
      this.tabsRepo,
      ids(copy.tabs),
      { settingsId },
      transaction,
    );
    await this.assertOwn(
      this.propertiesRepo,
      propertyIds,
      { settingsId },
      transaction,
    );
    await this.assertOwn(
      this.optionsRepo,
      ids(copy.options),
      { propertyId: propertyIds },
      transaction,
    );

    // Поля — поимённо: копия могла прийти файлом, и владельца или ключ списка она не меняет
    const {
      useCode,
      codeRequired,
      codeUnique,
      maxDepth,
      isHistoryEnabled,
      isDraftEnabled,
    } = copy.settings;
    await this.settingsRepo.update(
      {
        useCode,
        codeRequired,
        codeUnique,
        maxDepth,
        isHistoryEnabled,
        isDraftEnabled,
      },
      { where: { id: settingsId }, transaction },
    );

    // Вкладки — раньше свойств: свойства на них ссылаются
    await this.replace(
      this.tabsRepo,
      { settingsId },
      copy.tabs,
      'code',
      { settingsId },
      transaction,
    );
    await this.replace(
      this.propertiesRepo,
      { settingsId },
      copy.properties,
      'code',
      { settingsId },
      transaction,
    );
    // Варианты удалённых свойств ушли с ними каскадом — здесь только варианты
    // оставшихся. Вариант чужого свойства в файле копии не заводится
    const ownProperties = new Set(propertyIds);
    await this.replace(
      this.optionsRepo,
      { propertyId: propertyIds },
      copy.options.filter((row) => ownProperties.has(Number(row.propertyId))),
      'code',
      {},
      transaction,
    );

    await this.filtersRepo.destroy({ where: { settingsId }, transaction });
    await this.filtersRepo.bulkCreate(
      copy.filters.map(
        ({ key, position }) => ({ settingsId, key, position }) as never,
      ),
      { transaction },
    );
  }

  /** Записи в таблице раздела: замена целиком или только недостающие. */
  private async restoreRows(
    source: BackupSource,
    scope: WhereOptions,
    current: { id: number | string; isBlocked?: unknown }[],
    copy: BackupData,
    mode: RestoreMode,
    transaction: Transaction,
  ): Promise<void> {
    const plan = planRecords(current, copy.rows);
    const returned = new Set(plan.returned);
    const rows =
      mode === RestoreMode.Replace
        ? copy.rows
        : copy.rows.filter((row) => returned.has(Number(row.id)));
    await this.assertOwn(source.model, ids(rows), scope, transaction);

    if (mode === RestoreMode.Replace && plan.removed.length > 0) {
      await source.model.destroy({
        where: { ...scope, id: plan.removed },
        transaction,
      });
    }
    // Владелец записи — тот, чей это список, что бы ни было в файле
    const scoped = rows.map((row) => ({ ...row, ...(scope as BackupRow) }));
    await source.model.bulkCreate(scoped as never[], {
      ...this.overwrite(source.model),
      transaction,
    });

    if (!('parentId' in source.model.getAttributes())) return;
    const tree = (await source.model.findAll({
      attributes: ['id', 'parentId'],
      where: scope,
      raw: true,
      transaction,
    })) as unknown as { id: number; parentId: number | null }[];
    const orphans = orphanIds(tree);
    if (orphans.length > 0) {
      await source.model.update({ parentId: null } as never, {
        where: { ...scope, id: orphans },
        transaction,
      });
    }
  }

  /**
   * Значения свойств и черновики записей. Строки дерева и значения заводятся
   * заново — на их номера никто не ссылается. Значение свойства или варианта,
   * которого в списке больше нет, не возвращается: его некуда положить.
   */
  private async restoreRecords(
    settingsId: number,
    current: { id: number | string; isBlocked?: unknown }[],
    copy: BackupData,
    mode: RestoreMode,
    transaction: Transaction,
  ): Promise<void> {
    const plan = planRecords(current, copy.rows);
    // Какие записи берутся из копии: при замене — все, иначе — вернувшиеся
    const taken = new Set(
      (mode === RestoreMode.Replace ? ids(copy.rows) : plan.returned).map(
        String,
      ),
    );
    // Защищённые и не вошедшие в копию записи сохраняют свои значения
    const kept =
      mode === RestoreMode.Replace
        ? plan.kept.map(String)
        : current.map((row) => String(row.id)).filter((key) => !taken.has(key));

    await this.recordsRepo.destroy({
      where: { settingsId, ...notIn('recordKey', kept) },
      transaction,
    });
    await this.draftsRepo.destroy({
      where: { settingsId, ...notIn('recordKey', kept) },
      transaction,
    });

    const records = copy.records.filter((row) =>
      taken.has(String(row.recordKey)),
    );
    const created = await this.recordsRepo.bulkCreate(
      records.map((row) => ({
        settingsId,
        recordKey: String(row.recordKey),
        parentId: (row.parentId as string | null) ?? null,
      })),
      { transaction, returning: true },
    );
    const newId = new Map(
      records.map((row, index) => [Number(row.id), created[index].id]),
    );

    const properties = await this.propertiesRepo.findAll({
      attributes: ['id'],
      where: { settingsId },
      transaction,
    });
    const propertyIds = new Set(properties.map((row) => row.id));
    const options = await this.optionsRepo.findAll({
      attributes: ['id'],
      where: { propertyId: Array.from(propertyIds) },
      transaction,
    });
    const optionIds = new Set(options.map((row) => row.id));

    const values = copy.values.filter(
      (value) =>
        newId.has(Number(value.recordId)) &&
        propertyIds.has(Number(value.propertyId)) &&
        (value.optionId === null || optionIds.has(Number(value.optionId))),
    );
    await this.valuesRepo.bulkCreate(
      values.map(({ id: _id, recordId, ...value }) => ({
        ...value,
        recordId: newId.get(Number(recordId)),
      })) as never[],
      { transaction },
    );

    await this.draftsRepo.bulkCreate(
      copy.drafts
        .filter((draft) => taken.has(String(draft.recordKey)))
        .map(({ id: _id, ...draft }) => ({ ...draft, settingsId })) as never[],
      { transaction },
    );
  }

  /**
   * Строки из копии поверх нынешних по номеру: чего нет в копии — удаляется,
   * что есть — переписывается, недостающие заводятся с прежним номером.
   * Уникальный код сначала уводится в сторону: свойства, обменявшиеся
   * кодами, иначе столкнулись бы на середине записи.
   */
  private async replace(
    repo: ModelCtor<Model>,
    where: WhereOptions,
    rows: BackupRow[],
    uniqueField: string,
    forced: BackupRow,
    transaction: Transaction,
  ): Promise<void> {
    const rowIds = ids(rows);
    await repo.destroy({
      where: { ...where, ...notIn('id', rowIds) },
      transaction,
    });
    if (rows.length === 0) return;
    await repo.update(
      { [uniqueField]: Sequelize.literal(`'~restore-' || id`) } as never,
      { where: { ...where, id: rowIds }, transaction },
    );
    await repo.bulkCreate(
      rows.map((row) => ({ ...row, ...forced })) as never[],
      {
        ...this.overwrite(repo),
        transaction,
      },
    );
  }

  /**
   * Номера из копии свободны или уже этого списка. Чужая строка под тем же
   * номером — значит, копия не отсюда, и запись поверх переписала бы чужое.
   */
  private async assertOwn(
    repo: ModelCtor<Model>,
    rowIds: number[],
    where: WhereOptions,
    transaction: Transaction,
  ): Promise<void> {
    if (rowIds.length === 0) return;
    const all = await repo.count({ where: { id: rowIds }, transaction });
    const own = await repo.count({
      where: { ...where, id: rowIds },
      transaction,
    });
    if (all !== own) {
      throw new ConflictException(
        'Копия сделана не для этого списка: номера записей в ней чужие',
      );
    }
  }

  /**
   * Запись строки поверх найденной по номеру: все поля, кроме самого номера.
   * Конфликт — явно по `id`: иначе Sequelize берёт первый уникальный индекс
   * (код вкладки, email) и падает на совпавшем номере.
   */
  private overwrite(repo: ModelCtor<Model>): {
    updateOnDuplicate: string[];
    conflictAttributes: string[];
  } {
    return {
      updateOnDuplicate: Object.keys(repo.getAttributes()).filter(
        (name) => name !== 'id',
      ),
      conflictAttributes: ['id'],
    };
  }

  /** Таблица записей списка; у списка без копий — 400, у чужого типа контента — 404. */
  private async source(listKey: string): Promise<BackupSource> {
    const { key, kind } = resolveInfoblock(listKey);
    const source = this.sources[kind];
    if (!source)
      throw new BadRequestException(`У списка ${key} нет резервных копий`);
    if (kind === CONTENT_ITEMS_KIND) {
      const contentId = Number(key.split('.')[1]);
      if (
        (await this.contentsRepo.count({
          where: { id: contentId },
        })) === 0
      ) {
        throw new NotFoundException('Тип контента не найден');
      }
    }
    return source;
  }

  /** Копия этого списка или 404: копия другого списка неотличима от несуществующей. */
  private async getOwn(
    listKey: string,
    id: number,
  ): Promise<InfoblockBackup> {
    await this.source(listKey);
    const settingsId = await this.settings.settingsId(listKey);
    const backup =
      settingsId === null
        ? null
        : await this.backupsRepo.findOne({ where: { id, settingsId } });
    if (!backup) throw new NotFoundException('Копия не найдена');
    return backup;
  }
}
