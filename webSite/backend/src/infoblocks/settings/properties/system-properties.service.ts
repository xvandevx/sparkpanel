import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { Op, Transaction } from 'sequelize';
import { SITE_OWNER, isScopedKind, listDefaultName } from '../infoblock-kinds';
import { InfoblockSettings, emptySettings } from '../settings.model';
import { normalizeProperties, paramsOf } from './property';
import { InfoblockProperty } from './property.model';
import { SYSTEM_PROPERTIES, SystemProperty, systemPropertiesOf } from './system-properties';

/** Системные свойства стоят в карточке первыми: их место не выбирают. */
const SYSTEM_POSITION = 0;

/**
 * Сверка системных свойств с перечнем `system-properties.ts`. Запускается при
 * каждом старте сервера — как и схема базы, которая приводится к моделям сама:
 * поправили перечень, перезапустили — свойства у всех списков стали такими.
 * Новому списку их заводит `InfoblockSettingsService` в момент появления
 * его настроек, тем же `sync`.
 *
 * Перечень сильнее базы: название, тип, правила и параметры системного свойства
 * берутся из него, а правки через API сервер не пропускает (`isBlocked`).
 */
@Injectable()
export class SystemPropertiesService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SystemPropertiesService.name);

  constructor(
    @InjectModel(InfoblockSettings) private readonly settingsRepo: typeof InfoblockSettings,
    @InjectModel(InfoblockProperty) private readonly propertiesRepo: typeof InfoblockProperty,
    @InjectConnection() private readonly sequelize: Sequelize,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.sequelize.transaction(async (transaction) => {
      for (const kind of Object.keys(SYSTEM_PROPERTIES)) {
        // Настройки списка одни на сайт — заводим их сразу, а не первым
        // запросом: иначе их пришли бы заводить параллельно
        if (!isScopedKind(kind)) await this.ensureSettings(kind, transaction);

        const lists = await this.settingsRepo.findAll({
          where: { listKey: isScopedKind(kind) ? { [Op.like]: `${kind}.%` } : kind },
          transaction,
        });
        for (const settings of lists) await this.sync(settings.id, kind, transaction);
      }

      await this.releaseRemoved(transaction);
    });
  }

  /** Системные свойства одного списка — к перечню: нет — заводим, есть — выравниваем. */
  async sync(settingsId: number, kind: string, transaction?: Transaction): Promise<void> {
    const defs = systemPropertiesOf(kind);
    if (defs.length === 0) return;

    const rows = await this.propertiesRepo.findAll({ where: { settingsId }, transaction });
    const rowByCode = new Map(rows.map((row) => [row.code, row]));

    for (const def of defs) {
      const values = rowValues(def);
      const row = rowByCode.get(def.code);

      if (!row) {
        await this.propertiesRepo.create({ settingsId, code: def.code, ...values }, { transaction });
        continue;
      }

      // Свойство с этим кодом пользователь завёл сам. Того же типа — берём его
      // системным вместе со значениями; другого — не трогаем: стереть чужие
      // значения сверка не вправе, а под этим кодом их уже не прочитать
      if (row.type !== def.type) {
        this.logger.warn(
          `Настройки ${settingsId}: код «${def.code}» занят свойством типа «${row.type}» — ` +
            'системное свойство не заведено',
        );
        continue;
      }
      await row.update(values, { transaction });
    }
  }

  /** Настройки списка с системными свойствами: нет — заводим пустые. */
  private async ensureSettings(kind: string, transaction: Transaction): Promise<void> {
    const existing = await this.settingsRepo.findOne({
      where: { userId: SITE_OWNER, listKey: kind },
      transaction,
    });
    if (existing) return;
    await this.settingsRepo.create(
      { ...emptySettings(SITE_OWNER, kind), name: listDefaultName(kind) },
      { transaction },
    );
  }

  /**
   * Свойство убрали из перечня — оно становится обычным: значения у записей
   * остаются, а удалить его можно будет руками.
   */
  private async releaseRemoved(transaction: Transaction): Promise<void> {
    const blocked = await this.propertiesRepo.findAll({ where: { isBlocked: true }, transaction });
    if (blocked.length === 0) return;

    const lists = await this.settingsRepo.findAll({
      where: { id: [...new Set(blocked.map((row) => row.settingsId))] },
      transaction,
    });
    // Вид — ключ без номера владельца; ключи разделов из `to_delete/` тоже
    // встречаются, поэтому без `resolveInfoblock`, который их не узнает
    const kindById = new Map(lists.map((settings) => [settings.id, settings.listKey.split('.')[0]]));

    for (const row of blocked) {
      const kind = kindById.get(row.settingsId) ?? '';
      if (!systemPropertiesOf(kind).some((def) => def.code === row.code)) {
        await row.update({ isBlocked: false }, { transaction });
      }
    }
  }
}

/** Строка свойства по перечню: так её и заводят, и выравнивают. */
function rowValues(def: SystemProperty) {
  // Через ту же нормализацию, что и свойства из API: у каждого типа только свои параметры
  const [property] = normalizeProperties([{ ...def, tab: '' }]);
  return {
    name: property.name,
    hint: property.hint,
    type: property.type,
    tabId: null,
    required: property.required,
    multiple: property.multiple,
    isMultiDomain: property.isMultiDomain,
    isHidden: property.isHidden,
    isExternal: property.isExternal,
    position: SYSTEM_POSITION,
    params: paramsOf(property),
    isBlocked: true,
  };
}
