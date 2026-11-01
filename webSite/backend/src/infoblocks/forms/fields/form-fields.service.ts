import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { Transaction, UniqueConstraintError } from 'sequelize';
import { DEFAULT_SORT } from '../../record-sort';
import { HistoryAction } from '../../history/history.model';
import { HistoryAuthor, HistoryService } from '../../history/history.service';
import { PropertyValue } from '../../values/property-values.model';
import { PropertyValuesService } from '../../values/property-values.service';
import { FORM_FIELDS_LIST } from '../form-lists';
import { CreateFormFieldDto } from './dto/create-form-field.dto';
import { FormFieldDto } from './dto/form-field.dto';
import { UpdateFormFieldDto } from './dto/update-form-field.dto';
import { FormFields } from './form-fields.model';

/**
 * Поля форм обратной связи — плоский список редактора контента, общий на сайт.
 * К каким формам поле подключено, здесь не хранится: это значения системного
 * свойства «Поля» у форм. Отсюда они только читаются — чтобы не удалить поле,
 * которое стоит в форме.
 */
@Injectable()
export class FormFieldsService {
  constructor(
    @InjectModel(FormFields) private readonly fieldRepo: typeof FormFields,
    @InjectModel(PropertyValue) private readonly valueRepo: typeof PropertyValue,
    @InjectConnection() private readonly sequelize: Sequelize,
    private readonly historyService: HistoryService,
    private readonly values: PropertyValuesService,
  ) {}

  /** Поля по алфавиту. */
  async findAll(): Promise<FormFieldDto[]> {
    const [fields, linked] = await Promise.all([
      this.fieldRepo.findAll({
        order: [
          ['sort', 'ASC'],
          ['name', 'ASC'],
          ['id', 'ASC'],
        ],
      }),
      this.linkedIds(),
    ]);
    return fields.map((field) => FormFieldDto.from(field, linked.has(String(field.id))));
  }

  async create(dto: CreateFormFieldDto, author: HistoryAuthor): Promise<FormFieldDto> {
    return this.write(() =>
      this.sequelize.transaction(async (transaction) => {
        const field = await this.fieldRepo.create(
          { code: dto.code, name: dto.name, isActive: dto.isActive ?? true, sort: dto.sort ?? DEFAULT_SORT },
          { transaction },
        );
        await this.record(field, HistoryAction.Create, null, snapshot(field), author, transaction);
        return FormFieldDto.from(field, false);
      }),
    );
  }

  async update(id: number, dto: UpdateFormFieldDto, author: HistoryAuthor): Promise<FormFieldDto> {
    const field = await this.getOne(id);
    const before = snapshot(field);

    await this.write(() =>
      this.sequelize.transaction(async (transaction) => {
        await field.update(
          {
            ...(dto.code !== undefined ? { code: dto.code } : {}),
            ...(dto.name !== undefined ? { name: dto.name } : {}),
            ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
            ...(dto.sort !== undefined ? { sort: dto.sort } : {}),
          },
          { transaction },
        );
        await this.record(field, HistoryAction.Update, before, snapshot(field), author, transaction);
      }),
    );

    const linked = await this.linkedIds();
    return FormFieldDto.from(field, linked.has(String(field.id)));
  }

  /**
   * Подключённое к форме поле не удаляем: у формы осталась бы ссылка в никуда,
   * и вопрос молча пропал бы с сайта. Сначала поле убирают из форм.
   */
  async remove(id: number, author: HistoryAuthor): Promise<void> {
    const field = await this.getOne(id);
    if ((await this.linkedIds()).has(String(field.id))) {
      throw new ConflictException('Поле подключено к формам — сначала уберите его из них');
    }

    await this.sequelize.transaction(async (transaction) => {
      await this.record(field, HistoryAction.Delete, snapshot(field), null, author, transaction);
      await field.destroy({ transaction });
    });

    // Поле — запись своего списка: его значения свойств (плейсхолдер и прочее)
    // уходят вместе с ним. Список общий — значения лежат у владельца сайта
    await this.values.remove(FORM_FIELDS_LIST, [String(field.id)]);
  }

  private async getOne(id: number): Promise<FormFields> {
    const field = await this.fieldRepo.findByPk(id);
    if (!field) throw new NotFoundException('Поле не найдено');
    return field;
  }

  /**
   * Номера полей, на которые ведёт хоть одна привязка к контенту. Ищем по самим
   * значениям, а не по свойству «Поля»: поле могли выбрать и в своём свойстве
   * другого списка.
   */
  private async linkedIds(): Promise<Set<string>> {
    const rows = await this.valueRepo.findAll({
      attributes: ['json'],
      where: { json: { listKey: FORM_FIELDS_LIST } },
    });
    return new Set(rows.map((row) => String((row.json as { recordId?: unknown }).recordId)));
  }

  /** Журнал пишется под автором правки — из JWT, как у ролей и учётных записей. */
  private record(
    field: FormFields,
    action: HistoryAction,
    before: Record<string, unknown> | null,
    after: Record<string, unknown> | null,
    author: HistoryAuthor,
    transaction: Transaction,
  ) {
    return this.historyService.record({
      userId: author.id,
      entity: FORM_FIELDS_LIST,
      entityId: String(field.id),
      entityCode: field.code,
      entityName: field.name,
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
        throw new ConflictException('Поле с таким кодом уже есть');
      }
      throw error;
    }
  }
}

/** Плоский снимок для журнала: ключи совпадают с полями карточки. */
const snapshot = (field: FormFields): Record<string, unknown> => ({
  code: field.code,
  name: field.name,
  isActive: field.isActive,
  sort: field.sort,
});
