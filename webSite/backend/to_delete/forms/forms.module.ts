import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { HistoryModule } from '../history/history.module';
import { FormFields } from './form-field.model';
import { FormsController } from './forms.controller';
import { Forms } from './forms.model';
import { FormsService } from './forms.service';

/**
 * Веб-формы: формы обратной связи и их поля. Поля — отдельная сущность, но не
 * отдельный модуль: без своей формы поле не существует, и правят их на одном экране.
 */
@Module({
  imports: [SequelizeModule.forFeature([Forms, FormFields]), HistoryModule],
  controllers: [FormsController],
  providers: [FormsService],
  exports: [FormsService],
})
export class FormsModule {}
