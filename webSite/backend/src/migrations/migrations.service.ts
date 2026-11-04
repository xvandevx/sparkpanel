import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/sequelize';
import { ModelStatic, Transaction } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { MIGRATIONS } from './index';
import { SchemaMigration } from './schema-migration.model';

/**
 * Схема базы при старте сервера, до сверки системных свойств и до первого
 * запроса. Три шага, именно в этом порядке:
 *
 * 1. Таблицы, которых ещё нет, — целиком, с индексами моделей.
 * 2. Миграции, которых ещё нет в `schema_migrations`, — по порядку, в одной
 *    транзакции. Упала одна — не применена ни одна, и сервер не стартует:
 *    работать на полуприведённой базе хуже.
 * 3. Индексы моделей у таблиц, что уже были (`sync` без `alter`).
 *
 * Почему не обычный `sync` до миграций: у существующей таблицы он досоздаёт
 * индексы модели, а индекс на колонку, которую добавляет миграция, падает —
 * колонки ещё нет. Так обновление до v0.2.0 не поднималось на старой базе
 * (`infoblock_records_external_id`), пока миграцию не прогнали руками.
 */
@Injectable()
export class MigrationsService implements OnModuleInit {
  private readonly logger = new Logger(MigrationsService.name);

  constructor(
    @InjectModel(SchemaMigration) private readonly migrationsRepo: typeof SchemaMigration,
    @InjectConnection() private readonly sequelize: Sequelize,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.createMissingTables();
    await this.sequelize.transaction((transaction) => this.runPending(transaction));
    await this.sequelize.sync({ alter: false });
  }

  /**
   * Применить недостающие. Зовёт и восстановление копии сайта — в своей
   * транзакции: копия могла быть снята до части миграций.
   */
  async runPending(transaction: Transaction): Promise<void> {
    const applied = new Set(
      (await this.migrationsRepo.findAll({ attributes: ['name'], transaction })).map((row) => row.name),
    );
    for (const migration of MIGRATIONS) {
      if (applied.has(migration.name)) continue;
      await migration.up(this.sequelize, transaction);
      await this.migrationsRepo.create({ name: migration.name }, { transaction });
      this.logger.log(`Миграция ${migration.name} применена`);
    }
  }

  /**
   * Новые таблицы — в порядке внешних ключей, как их заводит `sync`: сначала
   * те, на которые ссылаются. Существующие не трогаем совсем — их приводят
   * миграции.
   */
  private async createMissingTables(): Promise<void> {
    const { modelManager } = this.sequelize;
    const sorted = modelManager.getModelsTopoSortedByForeignKey() ?? modelManager.models;
    const models = [...sorted].reverse() as ModelStatic<never>[];
    const queryInterface = this.sequelize.getQueryInterface();
    for (const model of models) {
      if (await queryInterface.tableExists(model.getTableName())) continue;
      await model.sync();
      this.logger.log(`Таблица ${String(model.getTableName())} заведена`);
    }
  }
}
