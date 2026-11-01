import { Global, Module } from '@nestjs/common';
import { StorageService } from './storage.service';

/**
 * Хранилище файлов — инфраструктура, а не раздел панели: своих маршрутов и таблиц
 * у модуля нет. Глобальный, чтобы фичам не приходилось импортировать его по цепочке.
 */
@Global()
@Module({
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
