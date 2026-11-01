import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { col, fn } from 'sequelize';
import { Files } from '../files/files.model';
import {
  S3Config,
  StorageKind,
  StorageService,
  StorageTarget,
  describe,
} from '../../storage/storage.service';
import { Settings } from '../../settings/settings.model';
import { SELECTED_STORAGE_KEY } from '../../settings/settings-values';
import { DEFAULT_SORT } from '../record-sort';
import { PropertyValueMap } from '../settings/properties/property';
import { STORAGE_PROPERTY } from '../settings/properties/system-properties';
import { PropertyValuesService, ValuesCheck } from '../values/property-values.service';
import { SaveStorageDto, StorageDto, UpdateStorageDto } from './dto/storage.dto';
import { Storages } from './storages.model';

/** Ключ списка хранилищ: под ним лежат свойства подключения и их значения. */
const STORAGES_LIST = 'storages';

/** Сколько ждём ответа хранилища при проверке: дольше — оно недоступно. */
const CHECK_TIMEOUT_MS = 10_000;

/** Адрес — только http(s): бэкенд сам ходит по нему, проверяя хранилище. */
const HTTP_URL = /^https?:\/\/[^\s/]+(\/[^\s]*)?$/;

/** Свойства, от которых зависит, пустит ли хранилище. Название и публичный адрес — нет. */
const CONNECTION_PROPERTIES: string[] = [
  STORAGE_PROPERTY.endpoint,
  STORAGE_PROPERTY.region,
  STORAGE_PROPERTY.bucket,
  STORAGE_PROPERTY.accessKey,
  STORAGE_PROPERTY.secretKey,
];

/**
 * Внешние хранилища: список, проверка при сохранении и адрес для загрузки.
 * Встроенное хранилище здесь не живёт — у него нет строки, оно `null`.
 *
 * Подключение — значения системных свойств списка. Проверяется оно, когда
 * их сохраняют (`checkConnection`): само хранилище заводится раньше, первым
 * запросом карточки, и без подключения его просто не выбрать для новых файлов.
 */
@Injectable()
export class StoragesService implements OnModuleInit {
  constructor(
    @InjectModel(Storages) private readonly storageRepo: typeof Storages,
    // Файлы и настройки здесь только читаются: кто занят и что выбрано
    @InjectModel(Files) private readonly fileRepo: typeof Files,
    @InjectModel(Settings) private readonly settingsRepo: typeof Settings,
    private readonly storage: StorageService,
    private readonly values: PropertyValuesService,
  ) {}

  onModuleInit(): void {
    this.values.registerCheck(STORAGES_LIST, this.checkConnection);
  }

  async findAll(): Promise<StorageDto[]> {
    const [storages, counts, selectedId] = await Promise.all([
      this.storageRepo.findAll({ order: [['sort', 'ASC'], ['name', 'ASC'], ['id', 'ASC']] }),
      this.countFiles(),
      this.selectedId(),
    ]);
    return storages.map((item) =>
      StorageDto.from(item, counts.get(item.id) ?? 0, item.id === selectedId),
    );
  }

  async create(dto: SaveStorageDto): Promise<StorageDto> {
    const created = await this.storageRepo.create({
      name: dto.name,
      isActive: dto.isActive ?? true,
      sort: dto.sort ?? DEFAULT_SORT,
    });
    return StorageDto.from(created, 0, false);
  }

  /** Выбранное для новых файлов не выключают: файлы ушли бы в неактивное. */
  async update(id: number, dto: UpdateStorageDto): Promise<StorageDto> {
    const storage = await this.getOne(id);
    const selectedId = await this.selectedId();
    if (dto.isActive === false && id === selectedId) {
      throw new ConflictException('Хранилище выбрано для новых файлов — сначала выберите другое');
    }

    await storage.update({
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      ...(dto.sort !== undefined ? { sort: dto.sort } : {}),
    });
    const counts = await this.countFiles();
    return StorageDto.from(storage, counts.get(id) ?? 0, id === selectedId);
  }

  /**
   * Удаляется только свободное хранилище: в выбранное ушли бы новые файлы,
   * а у лежащих в нём файлов не осталось бы ключей, чтобы их удалить.
   * Вместе с ним уходят значения его свойств — подключение.
   */
  async remove(id: number): Promise<void> {
    const storage = await this.getOne(id);
    if (id === (await this.selectedId())) {
      throw new ConflictException('Хранилище выбрано для новых файлов — сначала выберите другое');
    }
    const filesCount = await this.fileRepo.count({ where: { storageId: id } });
    if (filesCount > 0) {
      throw new ConflictException(`В хранилище лежат файлы (${filesCount}) — сначала удалите их`);
    }
    await storage.destroy();
    await this.values.remove(STORAGES_LIST, [String(id)]);
  }

  /** Куда идти за файлом этого хранилища; null — встроенное. Хранилища нет — null-цель. */
  async targetOf(storageId: number | null): Promise<StorageTarget | null> {
    if (storageId === null) return { kind: StorageKind.Builtin };
    const storage = await this.storageRepo.findByPk(storageId);
    if (!storage) return null;
    const values = await this.connections();
    return { kind: StorageKind.External, config: configOf(values.get(String(storageId))) };
  }

  /**
   * Куда идти за файлами каждого хранилища и как оно называется — разом для
   * списка файлов: хранилищ немного, а файлов сотни. Встроенного здесь нет —
   * у него `null`.
   */
  async targets(): Promise<Map<number, { name: string; target: StorageTarget }>> {
    const [storages, values] = await Promise.all([this.storageRepo.findAll(), this.connections()]);
    return new Map(
      storages.map((item) => [
        item.id,
        {
          name: item.name,
          target: { kind: StorageKind.External, config: configOf(values.get(String(item.id))) },
        },
      ]),
    );
  }

  /** Хранилище есть, включено и отвечает — его можно выбрать для новых файлов. */
  async assertSelectable(storageId: number): Promise<void> {
    const storage = await this.getOne(storageId);
    if (!storage.isActive) throw new BadRequestException('Хранилище выключено');
    const config = configOf((await this.connections()).get(String(storageId)));
    assertComplete(config);
    await this.assertReachable(config);
  }

  /**
   * Правка подключения. Поменяли адрес, бакет или ключи — проверяем заново:
   * в хранилище, которое не отвечает, новые файлы не попадут. Проверяется
   * итог правки целиком: секрет обычно не присылают — он тот, что сохранён.
   */
  private readonly checkConnection: ValuesCheck = async ({ touched, values }) => {
    const config = configOf(values);
    if (config.publicUrl !== '' && !HTTP_URL.test(config.publicUrl)) {
      throw new BadRequestException('Публичный адрес начинается с http:// или https://');
    }
    if (!touched.some((code) => CONNECTION_PROPERTIES.includes(code))) return;
    assertComplete(config);
    await this.assertReachable(config);
  };

  /** Подключение каждого хранилища, по номеру: значения свойств вместе с секретом. */
  private connections(): Promise<Map<string, PropertyValueMap>> {
    return this.values.codeValues(STORAGES_LIST);
  }

  private async getOne(id: number): Promise<Storages> {
    const storage = await this.storageRepo.findByPk(id);
    if (!storage) throw new NotFoundException('Хранилище не найдено');
    return storage;
  }

  /** Номер хранилища, выбранного для новых файлов; null — встроенное. */
  private async selectedId(): Promise<number | null> {
    const row = await this.settingsRepo.findOne({ where: { key: SELECTED_STORAGE_KEY } });
    const id = Number(row?.value);
    return Number.isInteger(id) && id > 0 ? id : null;
  }

  /** Файлов в каждом хранилище: один запрос с группировкой. */
  private async countFiles(): Promise<Map<number, number>> {
    const rows = (await this.fileRepo.findAll({
      attributes: ['storageId', [fn('COUNT', col('id')), 'count']],
      group: ['storageId'],
      raw: true,
    })) as unknown as { storageId: number | null; count: string }[];
    return new Map(
      rows
        .filter((row) => row.storageId !== null)
        .map((row) => [Number(row.storageId), Number(row.count)]),
    );
  }

  private async assertReachable(config: S3Config): Promise<void> {
    // Недоступный адрес держал бы запрос до системного таймаута — минуту и больше
    let timer: NodeJS.Timeout | undefined;
    try {
      await Promise.race([
        this.storage.check(config),
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error('нет ответа')), CHECK_TIMEOUT_MS);
        }),
      ]);
    } catch (error) {
      throw new BadRequestException(`Хранилище не отвечает: ${checkError(error)}`);
    } finally {
      clearTimeout(timer);
    }
  }
}

/** Подключение из значений свойств: незаполненное — пустой строкой. */
const configOf = (values: PropertyValueMap | undefined): S3Config => {
  const text = (code: string) => String(values?.[code] ?? '').trim();
  return {
    endpoint: text(STORAGE_PROPERTY.endpoint),
    region: text(STORAGE_PROPERTY.region),
    bucket: text(STORAGE_PROPERTY.bucket),
    accessKey: text(STORAGE_PROPERTY.accessKey),
    secretKey: text(STORAGE_PROPERTY.secretKey),
    publicUrl: text(STORAGE_PROPERTY.publicUrl),
  };
};

/** Без адреса, бакета и обоих ключей в хранилище не зайти — и проверять нечего. */
function assertComplete(config: S3Config): void {
  if (!HTTP_URL.test(config.endpoint)) {
    throw new BadRequestException('Адрес S3 API начинается с http:// или https://');
  }
  if (!config.bucket) throw new BadRequestException('Заполните бакет');
  if (!config.accessKey) throw new BadRequestException('Заполните ключ доступа');
  if (!config.secretKey) throw new BadRequestException('Заполните секретный ключ');
}

/** Ответ хранилища — человеку: у S3 ошибки часто без текста, только с кодом. */
const checkError = (error: unknown): string => {
  const status = (error as { $metadata?: { httpStatusCode?: number } })?.$metadata?.httpStatusCode;
  if (status === 403) return 'нет доступа к бакету — проверьте ключи';
  if (status === 404) return 'бакет не найден';
  if (status === 301 || status === 400) return 'проверьте адрес и регион';
  return describe(error);
};
