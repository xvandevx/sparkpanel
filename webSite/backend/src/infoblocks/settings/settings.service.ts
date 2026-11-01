import { ConflictException, Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { Transaction, UniqueConstraintError } from 'sequelize';
import { InfoblockSettingsDto } from './dto/settings.dto';
import { UpdateInfoblockSettingsDto } from './dto/update-settings.dto';
import { InfoblockDraft } from '../drafts/draft.model';
import {
  hasDrafts,
  listDefaultName,
  listMaxDepth,
  resolveInfoblock,
  SITE_OWNER,
} from './infoblock-kinds';
import { isTreeDepth } from './tree-depth';
import { InfoblockPropertyDto } from './properties/property.dto';
import { InfoblockPropertiesService } from './properties/properties.service';
import { SystemPropertiesService } from './properties/system-properties.service';
import { InfoblockSettings, emptySettings } from './settings.model';

/**
 * Настройки списка: имя, код, древовидность и правила символьного кода записей.
 * Свойства записей и вкладки карточки сюда не входят — у них свои сервисы
 * и свои маршруты.
 */
@Injectable()
export class InfoblockSettingsService {
  constructor(
    @InjectModel(InfoblockSettings)
    private readonly settingsRepo: typeof InfoblockSettings,
    @InjectModel(InfoblockDraft)
    private readonly draftsRepo: typeof InfoblockDraft,
    private readonly propertiesService: InfoblockPropertiesService,
    private readonly systemProperties: SystemPropertiesService,
    @InjectConnection() private readonly sequelize: Sequelize,
  ) {}

  /** Настройки списка; не сохраняли — пустые, а не 404: настройки есть у любого списка. */
  async findOne(
    listKey: string,
  ): Promise<InfoblockSettingsDto> {
    const { key } = resolveInfoblock(listKey);
    const settings = await this.find(key);
    return settings
      ? InfoblockSettingsDto.from(settings)
      : InfoblockSettingsDto.empty(key);
  }

  /**
   * Свойства списка и то, дерево ли он, — по ним проверяются и читаются значения
   * записей. Свойства приходят из своего сервиса: они живут отдельно.
   */
  async settingsOf(
    listKey: string,
    transaction?: Transaction,
  ): Promise<{
    properties: InfoblockPropertyDto[];
    isTree: boolean;
  }> {
    const settings = await this.find(listKey, transaction);
    return {
      properties: await this.propertiesService.findAll(
        listKey,
        transaction,
      ),
      // Своей колонки у дерева нет: дерево — это больше одного уровня вложенности
      isTree: isTreeDepth(listMaxDepth(settings, listKey)),
    };
  }

  /**
   * Сохранение настроек списка: имя, код и правила записей. Свойства и вкладки
   * сюда не приходят — у них свои маршруты.
   */
  async save(
    listKey: string,
    dto: UpdateInfoblockSettingsDto,
  ): Promise<InfoblockSettingsDto> {
    const { key } = resolveInfoblock(listKey);

    return this.sequelize.transaction(async (transaction) => {
      const existing = await this.find(key, transaction);

      const values = {
        name: dto.name?.trim() ?? existing?.name ?? listDefaultName(key),
        code: dto.code ?? existing?.code ?? emptySettings(0, key).code,
        // Код у записей есть, пока его не выключили: так ведут себя все разделы
        useCode: dto.useCode ?? existing?.useCode ?? true,
        codeRequired: dto.codeRequired ?? existing?.codeRequired ?? false,
        codeUnique: dto.codeUnique ?? existing?.codeUnique ?? false,
        isHistoryEnabled: dto.isHistoryEnabled ?? existing?.isHistoryEnabled ?? true,
        isDraftEnabled: hasDrafts(key) && (dto.isDraftEnabled ?? existing?.isDraftEnabled ?? false),
        // Не прислали — прежний, а у новых настроек — по умолчанию вида списка.
        // Уменьшенный предел записи, которые уже глубже, не трогает: он
        // проверяется, когда запись заводят или переносят. Свели до 1 — список
        // стал плоским, но родителей у записей это не стирает: вернут дерево —
        // вернётся как было
        maxDepth:
          dto.maxDepth !== undefined
            ? dto.maxDepth
            : listMaxDepth(existing, key),
      };

      // Выключили черновики, а они есть — их правки повисли бы: публиковать
      // их негде, а в таблице и карточке их уже не видно
      if (existing?.isDraftEnabled && !values.isDraftEnabled) {
        const drafts = await this.draftsRepo.count({ where: { settingsId: existing.id }, transaction });
        if (drafts > 0) {
          throw new ConflictException(
            `В списке есть черновики (${drafts}): опубликуйте или удалите их, потом выключайте`,
          );
        }
      }

      try {
        const settings = existing
          ? await existing.update(values, { transaction })
          : await this.settingsRepo.create(
              { userId: SITE_OWNER, listKey: key, ...values },
              { transaction },
            );

        return InfoblockSettingsDto.from(settings);
      } catch (error) {
        if (error instanceof UniqueConstraintError) {
          throw new ConflictException('Список с таким кодом уже есть');
        }
        throw error;
      }
    });
  }

  /**
   * Номер настроек списка; нет строки — null. По нему к настройкам привязаны
   * вкладки, свойства и значения записей: ключ списка это строка, и сменись
   * он, всё это осталось бы сиротами.
   */
  async settingsId(
    listKey: string,
    transaction?: Transaction,
  ): Promise<number | null> {
    const { key } = resolveInfoblock(listKey);
    const settings = await this.find(key, transaction);
    return settings?.id ?? null;
  }

  /**
   * Номер настроек, а нет строки — заводим пустую. Нужен тем, кто пишет внутрь
   * списка (вкладки, свойства, значения): настройки у списка есть всегда,
   * просто до первого сохранения они пустые.
   *
   * `findOrCreate`, а не поиск и создание порознь: редактор при первом показе
   * шлёт свойства и значения разом, и оба запроса пришли бы заводить одну
   * строку. Новому списку сразу заводятся его системные свойства.
   */
  async ensureSettingsId(
    listKey: string,
    transaction?: Transaction,
  ): Promise<number> {
    const { key, kind } = resolveInfoblock(listKey);
    const [settings, isCreated] = await this.settingsRepo.findOrCreate({
      where: { userId: SITE_OWNER, listKey: key },
      // Предел вложенности — сразу по умолчанию вида: дальше его читают из строки
      defaults: {
        ...emptySettings(SITE_OWNER, key),
        name: listDefaultName(key),
        maxDepth: listMaxDepth(null, key),
      },
      transaction,
    });
    if (isCreated)
      await this.systemProperties.sync(settings.id, kind, transaction);
    return settings.id;
  }

  /**
   * Имя и код списка, которые задаёт не окно настроек, а запись другого списка:
   * у элементов типа контента это название и код самого типа. Настроек ещё
   * нет — заводятся. Код занят другим списком — 409, и вызывающий откатывает
   * свою запись вместе с транзакцией.
   */
  async assignIdentity(
    listKey: string,
    identity: { name: string; code: string },
    transaction: Transaction,
  ): Promise<void> {
    const id = await this.ensureSettingsId(listKey, transaction);
    try {
      await this.settingsRepo.update(identity, { where: { id }, transaction });
    } catch (error) {
      if (error instanceof UniqueConstraintError) {
        throw new ConflictException('Список с таким кодом уже есть');
      }
      throw error;
    }
  }

  /**
   * Владелец имени и кода списка удалён — имя и код возвращаются к виду списка.
   * Иначе код так и остался бы занят: другой тип с тем же кодом не завёлся бы.
   */
  async releaseIdentity(
    listKey: string,
    transaction: Transaction,
  ): Promise<void> {
    const { key } = resolveInfoblock(listKey);
    await this.settingsRepo.update(
      { name: listDefaultName(key), code: emptySettings(0, key).code },
      {
        where: { userId: SITE_OWNER, listKey: key },
        transaction,
      },
    );
  }

  /** Настройки списка одни на сайт — владелец у всех `SITE_OWNER`. */
  private find(listKey: string, transaction?: Transaction) {
    return this.settingsRepo.findOne({
      where: { userId: SITE_OWNER, listKey },
      transaction,
    });
  }
}
