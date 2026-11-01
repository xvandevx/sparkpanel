import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { Op, QueryTypes, Transaction } from 'sequelize';
import { gzipSync } from 'zlib';
import { BackupKind } from '../infoblocks/backups/backup.model';
import { HistoryAuthor } from '../infoblocks/history/history.service';
import { MigrationsService } from '../migrations/migrations.service';
import { SystemPropertiesService } from '../infoblocks/settings/properties/system-properties.service';
import { SiteBackupDto, SiteBackupsDto } from './dto/site-backup.dto';
import { SiteBackup } from './site-backup.model';
import {
  SITE_BACKUPS_TABLE,
  SITE_DUMP_FORMAT,
  SITE_DUMP_VERSION,
  type SiteDump,
  columnsOf,
  parseSiteDump,
  rowsCount,
  tableOrder,
} from './site-dump';

/** Копии «перед восстановлением» живут столько, а свои — пока их не удалят. */
const BEFORE_RESTORE_DAYS = 30;

/** Имя таблицы или колонки в SQL. Имена берутся только из самой базы, не из файла копии. */
const quote = (name: string): string => `"${name.replace(/"/g, '""')}"`;

interface Snapshot {
  data: Buffer;
  tablesCount: number;
  rowsCount: number;
}

/**
 * Копия всей базы и возврат к ней. Работает с таблицами напрямую, мимо
 * моделей: в копию идёт всё, что лежит в схеме, включая отложенные разделы
 * и старые таблицы, — кроме самих копий сайта (`site_backups`).
 *
 * Схему копия не несёт: её задают модели. Поэтому при возврате строки
 * ложатся по колонкам, которые есть и в копии, и в базе; таблиц и колонок,
 * которых в базе уже нет, копия не создаёт.
 */
@Injectable()
export class SiteBackupsService {
  constructor(
    @InjectModel(SiteBackup) private readonly backupsRepo: typeof SiteBackup,
    @InjectConnection() private readonly sequelize: Sequelize,
    private readonly systemProperties: SystemPropertiesService,
    private readonly migrations: MigrationsService,
  ) {}

  async findAll(): Promise<SiteBackupsDto> {
    const backups = await this.backupsRepo.findAll({
      attributes: { exclude: ['data'] },
      order: [['createdAt', 'DESC']],
    });
    const [{ size }] = await this.sequelize.query<{ size: string }>(
      `SELECT coalesce(sum(pg_total_relation_size(quote_ident(tablename))), 0) AS size
         FROM pg_tables WHERE schemaname = 'public' AND tablename <> :skip`,
      { type: QueryTypes.SELECT, replacements: { skip: SITE_BACKUPS_TABLE } },
    );
    return { items: backups.map(SiteBackupDto.from), databaseSize: Number(size) };
  }

  async create(author: HistoryAuthor): Promise<SiteBackupDto> {
    // Один снимок на все таблицы: правка посреди копии не попадёт в неё наполовину
    const backup = await this.sequelize.transaction(
      { isolationLevel: Transaction.ISOLATION_LEVELS.REPEATABLE_READ },
      async (transaction) =>
        this.save(BackupKind.Manual, '', await this.snapshot(transaction), author, transaction),
    );
    return SiteBackupDto.from(backup);
  }

  /** Загрузить файл, скачанный «Скачать»: в копии он проверяется и ложится сжатым. */
  async upload(fileName: string, file: Buffer | undefined, author: HistoryAuthor): Promise<SiteBackupDto> {
    if (!file) throw new BadRequestException('Файл копии не передан');
    const dump = parseSiteDump(file);
    const snapshot: Snapshot = {
      data: gzipSync(JSON.stringify(dump)),
      tablesCount: Object.keys(dump.tables).length,
      rowsCount: rowsCount(dump),
    };
    const backup = await this.sequelize.transaction((transaction) =>
      this.save(BackupKind.Upload, fileName, snapshot, author, transaction),
    );
    return SiteBackupDto.from(backup);
  }

  /** Копия файлом: сжатый JSON — тем же файлом её потом загружают обратно. */
  async file(id: number): Promise<{ data: Buffer; createdAt: Date }> {
    const backup = await this.get(id);
    return { data: backup.data, createdAt: backup.createdAt };
  }

  async remove(id: number): Promise<void> {
    await (await this.get(id)).destroy();
  }

  /**
   * Вернуть базу к копии. Одна транзакция: сначала копия того, что есть,
   * потом все таблицы стираются и заливаются из копии. Упало на середине —
   * база прежняя, копии «перед восстановлением» тоже нет.
   */
  async restore(id: number, author: HistoryAuthor): Promise<SiteBackupDto> {
    const dump = parseSiteDump((await this.get(id)).data);

    let before: SiteBackup;
    try {
      before = await this.sequelize.transaction(
        { isolationLevel: Transaction.ISOLATION_LEVELS.REPEATABLE_READ },
        async (transaction) => {
        const saved = await this.save(
          BackupKind.BeforeRestore,
          '',
          await this.snapshot(transaction),
          author,
          transaction,
        );
          await this.replaceTables(dump, transaction);
          // Копия могла быть снята до части миграций: её данные догоняют схему
          await this.migrations.runPending(transaction);
          return saved;
        },
      );
    } catch (error) {
      // Копия не легла в нынешнюю схему (скажем, новая колонка без значения
      // по умолчанию) — база откатилась, причину отдаём как есть
      throw new BadRequestException(
        `Копию не удалось вернуть, база не изменилась: ${(error as Error).message}`,
      );
    }

    // Системные свойства сверяются с перечнем при старте сервера — копия
    // могла быть снята до того, как перечень поменялся
    await this.systemProperties.onApplicationBootstrap();
    return SiteBackupDto.from(before);
  }

  private async get(id: number): Promise<SiteBackup> {
    const backup = await this.backupsRepo.findByPk(id);
    if (!backup) throw new NotFoundException('Копия не найдена');
    return backup;
  }

  private async save(
    kind: BackupKind,
    note: string,
    snapshot: Snapshot,
    author: HistoryAuthor,
    transaction: Transaction,
  ): Promise<SiteBackup> {
    const old = new Date(Date.now() - BEFORE_RESTORE_DAYS * 24 * 60 * 60 * 1000);
    await this.backupsRepo.destroy({
      where: { kind: BackupKind.BeforeRestore, createdAt: { [Op.lt]: old } },
      transaction,
    });
    return this.backupsRepo.create(
      {
        kind,
        note: note.trim(),
        ...snapshot,
        size: snapshot.data.length,
        authorId: author.id,
        authorEmail: author.email,
      },
      { transaction },
    );
  }

  /** Все таблицы схемы, кроме копий сайта, — строками; JSON собирает сама база. */
  private async snapshot(transaction: Transaction): Promise<Snapshot> {
    const tables = await this.tables(transaction);
    const parts: string[] = [];
    let rows = 0;
    for (const table of tables) {
      const [result] = await this.sequelize.query<{ count: number; rows: string }>(
        `SELECT count(*)::int AS count, coalesce(json_agg(t), '[]')::text AS rows FROM ${quote(table)} t`,
        { type: QueryTypes.SELECT, transaction },
      );
      rows += result.count;
      parts.push(`${JSON.stringify(table)}:${result.rows}`);
    }
    const json = `{"format":${JSON.stringify(SITE_DUMP_FORMAT)},"version":${SITE_DUMP_VERSION},"tables":{${parts.join(',')}}}`;
    return { data: gzipSync(json), tablesCount: tables.length, rowsCount: rows };
  }

  /**
   * Стирает все таблицы разом и заливает строки копии: таблицу, на которую
   * ссылаются, раньше ссылающейся. Строку в типы колонок переводит сама база
   * (`json_populate_recordset`) — тем же текстом, каким `json_agg` её выдал.
   * Колонки, которых в копии нет, получают значения по умолчанию.
   * Номера строк сохраняются, счётчики номеров выставляются за последний.
   */
  private async replaceTables(
    dump: SiteDump,
    transaction: Transaction,
  ): Promise<void> {
    const tables = await this.tables(transaction);
    const columns = await this.columns(transaction);
    const references = await this.sequelize.query<{ table: string; ref: string }>(
      `SELECT src.relname AS "table", dst.relname AS "ref"
         FROM pg_constraint c
         JOIN pg_class src ON src.oid = c.conrelid
         JOIN pg_class dst ON dst.oid = c.confrelid
        WHERE c.contype = 'f' AND c.connamespace = 'public'::regnamespace`,
      { type: QueryTypes.SELECT, transaction },
    );

    await this.sequelize.query(`TRUNCATE ${tables.map(quote).join(', ')} RESTART IDENTITY`, {
      transaction,
    });

    for (const table of tableOrder(tables, references)) {
      const rows = dump.tables[table];
      if (!rows || rows.length === 0) continue;
      const existing = new Set((columns.get(table) ?? []).map((column) => column.name));
      const names = columnsOf(rows).filter((name) => existing.has(name)).map(quote).join(', ');
      if (!names) continue;
      await this.sequelize.query(
        `INSERT INTO ${quote(table)} (${names})
         SELECT ${names} FROM json_populate_recordset(NULL::${quote(table)}, $1::json)`,
        { bind: [JSON.stringify(rows)], transaction },
      );
    }

    for (const table of tables) {
      for (const column of columns.get(table) ?? []) {
        if (!column.isSerial) continue;
        await this.sequelize.query(
          `SELECT setval(pg_get_serial_sequence(:table, :column), coalesce(max(${quote(column.name)}), 0) + 1, false)
             FROM ${quote(table)}`,
          { replacements: { table: quote(table), column: column.name }, transaction },
        );
      }
    }
  }

  private async tables(transaction: Transaction): Promise<string[]> {
    const rows = await this.sequelize.query<{ name: string }>(
      `SELECT tablename AS name FROM pg_tables
        WHERE schemaname = 'public' AND tablename <> :skip ORDER BY tablename`,
      { type: QueryTypes.SELECT, replacements: { skip: SITE_BACKUPS_TABLE }, transaction },
    );
    return rows.map((row) => row.name);
  }

  /** Колонки таблиц базы; `isSerial` — номер из счётчика (`SERIAL`). */
  private async columns(
    transaction: Transaction,
  ): Promise<Map<string, { name: string; isSerial: boolean }[]>> {
    const rows = await this.sequelize.query<{ table: string; name: string; isSerial: boolean }>(
      `SELECT table_name AS "table", column_name AS name,
              coalesce(column_default LIKE 'nextval(%', false) AS "isSerial"
         FROM information_schema.columns WHERE table_schema = 'public'`,
      { type: QueryTypes.SELECT, transaction },
    );
    const byTable = new Map<string, { name: string; isSerial: boolean }[]>();
    for (const row of rows) {
      byTable.set(row.table, [...(byTable.get(row.table) ?? []), { name: row.name, isSerial: row.isSerial }]);
    }
    return byTable;
  }
}
