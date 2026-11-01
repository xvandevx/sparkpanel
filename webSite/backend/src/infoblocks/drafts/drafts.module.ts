import { Module } from '@nestjs/common';
import { InfoblockSettingsModule } from '../settings/settings.module';
import { DraftsController } from './drafts.controller';
import { DraftsService } from './drafts.service';

/**
 * Черновики записей любого списка (`infoblock_drafts`). Модель зарегистрирована
 * в модуле настроек и приходит отсюда через него: черновики читают и настройки
 * (выключить их нельзя, пока они есть), и значения (удалили запись — ушёл
 * и её черновик).
 */
@Module({
  imports: [InfoblockSettingsModule],
  controllers: [DraftsController],
  providers: [DraftsService],
  exports: [DraftsService],
})
export class DraftsModule {}
