import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { Transaction, UniqueConstraintError } from 'sequelize';
import { DEFAULT_SORT } from '../record-sort';
import { HistoryAction } from '../history/history.model';
import { HistoryAuthor, HistoryService } from '../history/history.service';
import { PropertyValue } from '../values/property-values.model';
import { PropertyValuesService } from '../values/property-values.service';
import { CreateFormDto } from './dto/create-form.dto';
import { FormDto } from './dto/form.dto';
import { UpdateFormDto } from './dto/update-form.dto';
import { FORMS_LIST } from './form-lists';
import { Forms } from './forms.model';

/**
 * Формы обратной связи — плоский список редактора контента, общий на сайт:
 * владельца у формы нет, изоляции по `userId` тоже. Всё, что сверх кода,
 * названия и активности (поля, получатель заявок, текст после отправки), —
 * свойства списка: их значения пишет и читает `infoblocks/values`, здесь их
 * только стирают вместе с формой.
 */
@Injectable()
export class FormsService {
  constructor(
    @InjectModel(Forms) private readonly formRepo: typeof Forms,
    // Значения свойств только читаются: выбрана ли форма в чьей-то привязке
    @InjectModel(PropertyValue) private readonly valueRepo: typeof PropertyValue,
    @InjectConnection() private readonly sequelize: Sequelize,
    private readonly historyService: HistoryService,
    private readonly values: PropertyValuesService,
  ) {}

  /** Формы по алфавиту. */
  async findAll(): Promise<FormDto[]> {
    const [forms, linked] = await Promise.all([
      this.formRepo.findAll({
        order: [
          ['sort', 'ASC'],
          ['name', 'ASC'],
          ['id', 'ASC'],
        ],
      }),
      this.linkedIds(),
    ]);
    return forms.map((form) => FormDto.from(form, linked.has(String(form.id))));
  }

  async create(dto: CreateFormDto, author: HistoryAuthor): Promise<FormDto> {
    return this.write(() =>
      this.sequelize.transaction(async (transaction) => {
        const form = await this.formRepo.create(
          { code: dto.code, name: dto.name, isActive: dto.isActive ?? true, sort: dto.sort ?? DEFAULT_SORT },
          { transaction },
        );
        await this.record(form, HistoryAction.Create, null, snapshot(form), author, transaction);
        return FormDto.from(form, false);
      }),
    );
  }

  async update(id: number, dto: UpdateFormDto, author: HistoryAuthor): Promise<FormDto> {
    const form = await this.getOne(id);
    const before = snapshot(form);

    await this.write(() =>
      this.sequelize.transaction(async (transaction) => {
        await form.update(
          {
            ...(dto.code !== undefined ? { code: dto.code } : {}),
            ...(dto.name !== undefined ? { name: dto.name } : {}),
            ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
            ...(dto.sort !== undefined ? { sort: dto.sort } : {}),
          },
          { transaction },
        );
        await this.record(form, HistoryAction.Update, before, snapshot(form), author, transaction);
      }),
    );

    const linked = await this.linkedIds();
    return FormDto.from(form, linked.has(String(form.id)));
  }

  /**
   * Форму, которую выбрали в привязке другой записи (страница с формой), не
   * удаляем: там осталась бы ссылка в никуда, и форма молча пропала бы со страницы.
   */
  async remove(id: number, author: HistoryAuthor): Promise<void> {
    const form = await this.getOne(id);
    if ((await this.linkedIds()).has(String(form.id))) {
      throw new ConflictException('Форма выбрана в привязке другой записи — сначала уберите её там');
    }

    await this.sequelize.transaction(async (transaction) => {
      await this.record(form, HistoryAction.Delete, snapshot(form), null, author, transaction);
      await form.destroy({ transaction });
    });

    // Значения свойств уходят вместе с формой, и её привязки к полям тоже:
    // иначе поле так и числилось бы подключённым к форме, которой нет.
    // Список общий — его значения лежат у владельца сайта
    await this.values.remove(FORMS_LIST, [String(form.id)]);
  }

  private async getOne(id: number): Promise<Forms> {
    const form = await this.formRepo.findByPk(id);
    if (!form) throw new NotFoundException('Форма не найдена');
    return form;
  }

  /** Номера форм, на которые ведёт хоть одна привязка к контенту. */
  private async linkedIds(): Promise<Set<string>> {
    const rows = await this.valueRepo.findAll({
      attributes: ['json'],
      where: { json: { listKey: FORMS_LIST } },
    });
    return new Set(rows.map((row) => String((row.json as { recordId?: unknown }).recordId)));
  }

  /** Журнал пишется под автором правки — из JWT, как у ролей и учётных записей. */
  private record(
    form: Forms,
    action: HistoryAction,
    before: Record<string, unknown> | null,
    after: Record<string, unknown> | null,
    author: HistoryAuthor,
    transaction: Transaction,
  ) {
    return this.historyService.record({
      userId: author.id,
      entity: FORMS_LIST,
      entityId: String(form.id),
      entityCode: form.code,
      entityName: form.name,
      action,
      before,
      after,
      author,
      transaction,
    });
  }

  /** Повтор кода ловит уникальный индекс — наружу это 409, а не 500. */
  private async write<T>(run: () => Promise<T>): Promise<T> {
    try {
      return await run();
    } catch (error) {
      if (error instanceof UniqueConstraintError) {
        throw new ConflictException('Форма с таким кодом уже есть');
      }
      throw error;
    }
  }
}

/** Плоский снимок для журнала: ключи совпадают с полями карточки. */
const snapshot = (form: Forms): Record<string, unknown> => ({
  code: form.code,
  name: form.name,
  isActive: form.isActive,
  sort: form.sort,
});
