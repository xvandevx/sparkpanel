import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/sequelize';
import { Transaction } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { MIGRATIONS } from './index';
import { SchemaMigration } from './schema-migration.model';

/**
 * Миграции базы. При старте сервера — после `sync`, который заводит только
 * новые таблицы, и до сверки системных свойств — применяются те, которых
 * ещё нет в `schema_migrations`, по порядку, в одной транзакции. Упала
 * одна — не применена ни одна, и сервер не стартует: работать на
 * полуприведённой базе хуже.
 */
@Injectable()
export class MigrationsService implements OnModuleInit {
  private readonly logger = new Logger(MigrationsService.name);

  constructor(
    @InjectModel(SchemaMigration) private readonly migrationsRepo: typeof SchemaMigration,
    @InjectConnection() private readonly sequelize: Sequelize,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.sequelize.transaction((transaction) => this.runPending(transaction));
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
}
