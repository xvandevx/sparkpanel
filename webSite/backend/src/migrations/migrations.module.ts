import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { MigrationsService } from './migrations.service';
import { SchemaMigration } from './schema-migration.model';

/** Миграции базы (`src/migrations/`): применяются при старте сервера. */
@Module({
  imports: [SequelizeModule.forFeature([SchemaMigration])],
  providers: [MigrationsService],
  exports: [MigrationsService],
})
export class MigrationsModule {}
