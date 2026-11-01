import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/sequelize';
import { Model, Sequelize } from 'sequelize-typescript';
import { Transaction, UniqueConstraintError } from 'sequelize';
import { HistoryAction } from '../history/history.model';
import { HistoryAuthor, HistoryService } from '../history/history.service';
import { CreateFormFieldDto } from './dto/create-form-field.dto';
import { CreateFormDto } from './dto/create-form.dto';
import { FormDto } from './dto/form.dto';
import { FormFieldDto } from './dto/form-field.dto';
import { UpdateFormFieldDto } from './dto/update-form-field.dto';
import { UpdateFormDto } from './dto/update-form.dto';
import { FormFields, FormFieldType } from './form-field.model';
import { Forms } from './forms.model';

/** Тип записи в журнале изменений — общий на формы и их поля: раздел-то один. */
export const FORMS_ENTITY = 'forms';

/**
 * Ключ записи в журнале. Формы и поля лежат в разных таблицах, а журнал у раздела
 * общий, и голые номера двух таблиц в нём перепутались бы — поэтому ключ с приставкой.
 * Ту же строку админка использует как идентификатор строки таблицы.
 */
export const formHistoryId = (id: number): string => `form-${id}`;
export const fieldHistoryId = (id: number): string => `field-${id}`;

/** Шаг сортировки: между соседями остаётся место, чтобы вставить запись вручную. */
const POSITION_STEP = 100;

const DEFAULT_SUBMIT_LABEL = 'Отправить';

/** Что именно сохраняем — от этого зависит текст ошибки про занятый код. */
type RowKind = 'form' | 'field';

/** Значения строки при создании формы. */
interface NewFormRow {
  userId: number;
  code: string;
  name: string;
  description: string | null;
  notifyEmail: string;
  successMessage: string | null;
  submitLabel: string;
  isActive: boolean;
  position: number;
}

/** Значения строки при создании поля формы. */
interface NewFieldRow {
  userId: number;
  formId: number;
  code: string;
  label: string;
  type: FormFieldType;
  placeholder: string | null;
  options: string[];
  isRequired: boolean;
  isActive: boolean;
  position: number;
}

@Injectable()
export class FormsService {
  constructor(
    @InjectModel(Forms) private readonly formRepo: typeof Forms,
    @InjectModel(FormFields) private readonly fieldRepo: typeof FormFields,
    @InjectConnection() private readonly sequelize: Sequelize,
    private readonly historyService: HistoryService,
  ) {}

  /** Все формы пользователя вместе с полями: админка показывает их одним деревом. */
  async findAll(userId: number): Promise<FormDto[]> {
    const forms = await this.formRepo.findAll({
      where: { userId },
      order: [
        ['position', 'ASC'],
        ['createdAt', 'ASC'],
      ],
    });

    const fieldsByForm = await this.fieldsByForm(
      userId,
      forms.map((form) => form.id),
    );
    return forms.map((form) => FormDto.from(form, fieldsByForm.get(form.id) ?? []));
  }

  async findOne(userId: number, id: number): Promise<FormDto> {
    const form = await this.getOwnForm(userId, id);
    return FormDto.from(form, await this.formFields(userId, id));
  }

  async create(userId: number, dto: CreateFormDto, author: HistoryAuthor): Promise<FormDto> {
    return this.sequelize.transaction(async (transaction) => {
      const form = await this.createRow(
        {
          userId,
          code: dto.code,
          name: dto.name,
          description: dto.description ?? null,
          notifyEmail: dto.notifyEmail ?? '',
          successMessage: dto.successMessage ?? null,
          submitLabel: dto.submitLabel ?? DEFAULT_SUBMIT_LABEL,
          isActive: dto.isActive ?? true,
          position: dto.position ?? (await this.nextFormPosition(userId, transaction)),
        },
        transaction,
      );

      await this.historyService.record({
        userId,
        entity: FORMS_ENTITY,
        entityId: formHistoryId(form.id),
        entityCode: form.code,
        entityName: form.name,
        action: HistoryAction.Create,
        after: formSnapshot(form),
        author,
        transaction,
      });

      return FormDto.from(form, []);
    });
  }

  async update(
    userId: number,
    id: number,
    dto: UpdateFormDto,
    author: HistoryAuthor,
  ): Promise<FormDto> {
    const form = await this.getOwnForm(userId, id);
    const before = formSnapshot(form);

    return this.sequelize.transaction(async (transaction) => {
      await this.updateRow(form, definedOnly(dto), 'form', transaction);

      await this.historyService.record({
        userId,
        entity: FORMS_ENTITY,
        entityId: formHistoryId(form.id),
        entityCode: form.code,
        entityName: form.name,
        action: HistoryAction.Update,
        before,
        after: formSnapshot(form),
        author,
        transaction,
      });

      return FormDto.from(form, await this.formFields(userId, form.id, transaction));
    });
  }

  /** Удаление формы вместе с полями: поле без формы показывать негде. */
  async remove(
    userId: number,
    id: number,
    author: HistoryAuthor,
  ): Promise<{ removedFields: number }> {
    const form = await this.getOwnForm(userId, id);
    const fields = await this.formFields(userId, id);

    await this.sequelize.transaction(async (transaction) => {
      for (const field of fields) {
        await this.historyService.record({
          userId,
          entity: FORMS_ENTITY,
          entityId: fieldHistoryId(field.id),
          entityCode: field.code,
          entityName: field.label,
          action: HistoryAction.Delete,
          before: fieldSnapshot(field),
          author,
          transaction,
        });
      }
      await this.historyService.record({
        userId,
        entity: FORMS_ENTITY,
        entityId: formHistoryId(form.id),
        entityCode: form.code,
        entityName: form.name,
        action: HistoryAction.Delete,
        before: formSnapshot(form),
        author,
        transaction,
      });

      await this.fieldRepo.destroy({ where: { userId, formId: form.id }, transaction });
      await this.formRepo.destroy({ where: { userId, id: form.id }, transaction });
    });

    return { removedFields: fields.length };
  }

  async createField(
    userId: number,
    formId: number,
    dto: CreateFormFieldDto,
    author: HistoryAuthor,
  ): Promise<FormFieldDto> {
    const form = await this.getOwnForm(userId, formId);
    const type = dto.type ?? FormFieldType.Text;
    const options = optionsFor(type, dto.options ?? []);
    assertOptions(type, options);

    return this.sequelize.transaction(async (transaction) => {
      const field = await this.createFieldRow(
        {
          userId,
          formId: form.id,
          code: dto.code,
          label: dto.label,
          type,
          placeholder: dto.placeholder ?? null,
          options,
          isRequired: dto.isRequired ?? false,
          isActive: dto.isActive ?? true,
          position: dto.position ?? (await this.nextFieldPosition(userId, form.id, transaction)),
        },
        transaction,
      );

      await this.historyService.record({
        userId,
        entity: FORMS_ENTITY,
        entityId: fieldHistoryId(field.id),
        entityCode: field.code,
        entityName: field.label,
        action: HistoryAction.Create,
        after: fieldSnapshot(field),
        author,
        transaction,
      });

      return FormFieldDto.from(field);
    });
  }

  async updateField(
    userId: number,
    formId: number,
    id: number,
    dto: UpdateFormFieldDto,
    author: HistoryAuthor,
  ): Promise<FormFieldDto> {
    await this.getOwnForm(userId, formId);
    const field = await this.getOwnField(userId, formId, id);
    const before = fieldSnapshot(field);

    // Тип поля определяет, нужны ли варианты: стало «Списком» — они обязательны,
    // перестало — прежние варианты уходят, иначе они всплыли бы при возврате типа.
    const type = dto.type ?? field.type;
    const options = optionsFor(type, dto.options ?? field.options ?? []);
    assertOptions(type, options);

    return this.sequelize.transaction(async (transaction) => {
      await this.updateRow(field, { ...definedOnly(dto), type, options }, 'field', transaction);

      await this.historyService.record({
        userId,
        entity: FORMS_ENTITY,
        entityId: fieldHistoryId(field.id),
        entityCode: field.code,
        entityName: field.label,
        action: HistoryAction.Update,
        before,
        after: fieldSnapshot(field),
        author,
        transaction,
      });

      return FormFieldDto.from(field);
    });
  }

  async removeField(
    userId: number,
    formId: number,
    id: number,
    author: HistoryAuthor,
  ): Promise<{ removedFields: number }> {
    await this.getOwnForm(userId, formId);
    const field = await this.getOwnField(userId, formId, id);

    await this.sequelize.transaction(async (transaction) => {
      await this.historyService.record({
        userId,
        entity: FORMS_ENTITY,
        entityId: fieldHistoryId(field.id),
        entityCode: field.code,
        entityName: field.label,
        action: HistoryAction.Delete,
        before: fieldSnapshot(field),
        author,
        transaction,
      });
      await field.destroy({ transaction });
    });

    return { removedFields: 1 };
  }

  /** История одной записи: `entityId` — уже с приставкой (`form-1`, `field-3`). */
  findHistory(userId: number, entityId: string) {
    return this.historyService.findByEntityId(userId, FORMS_ENTITY, entityId);
  }

  findJournal(userId: number, limit: number, offset: number) {
    return this.historyService.findByEntity(userId, FORMS_ENTITY, limit, offset);
  }

  private async getOwnForm(userId: number, id: number): Promise<Forms> {
    // Фильтр по userId, а не только по id: формы всех пользователей в одной таблице.
    const form = await this.formRepo.findOne({ where: { id, userId } });
    if (!form) throw new NotFoundException('Форма не найдена');
    return form;
  }

  private async getOwnField(userId: number, formId: number, id: number): Promise<FormFields> {
    const field = await this.fieldRepo.findOne({ where: { id, formId, userId } });
    if (!field) throw new NotFoundException('Поле формы не найдено');
    return field;
  }

  private formFields(userId: number, formId: number, transaction?: Transaction) {
    return this.fieldRepo.findAll({
      where: { userId, formId },
      order: [
        ['position', 'ASC'],
        ['createdAt', 'ASC'],
      ],
      transaction,
    });
  }

  /** Поля сразу для списка форм: один запрос на весь экран, а не на строку. */
  private async fieldsByForm(
    userId: number,
    formIds: number[],
  ): Promise<Map<number, FormFields[]>> {
    const result = new Map<number, FormFields[]>();
    if (formIds.length === 0) return result;

    const fields = await this.fieldRepo.findAll({
      where: { userId, formId: formIds },
      order: [
        ['position', 'ASC'],
        ['createdAt', 'ASC'],
      ],
    });
    for (const field of fields) {
      const list = result.get(field.formId) ?? [];
      list.push(field);
      result.set(field.formId, list);
    }

    return result;
  }

  private async nextFormPosition(userId: number, transaction: Transaction): Promise<number> {
    const max = await this.formRepo.max('position', { where: { userId }, transaction });
    return (Number(max) || 0) + POSITION_STEP;
  }

  private async nextFieldPosition(
    userId: number,
    formId: number,
    transaction: Transaction,
  ): Promise<number> {
    const max = await this.fieldRepo.max('position', { where: { userId, formId }, transaction });
    return (Number(max) || 0) + POSITION_STEP;
  }

  private async createRow(values: NewFormRow, transaction: Transaction): Promise<Forms> {
    try {
      return await this.formRepo.create(values, { transaction });
    } catch (error) {
      throw toFriendlyError(error, 'form');
    }
  }

  private async createFieldRow(
    values: NewFieldRow,
    transaction: Transaction,
  ): Promise<FormFields> {
    try {
      return await this.fieldRepo.create(values, { transaction });
    } catch (error) {
      throw toFriendlyError(error, 'field');
    }
  }

  private async updateRow(
    // Тип строки здесь неважен: обе модели обновляются одинаково, а объединение
    // Forms | FormFields ломает вывод перегрузок `update` в sequelize-typescript.
    row: Model,
    values: Record<string, unknown>,
    kind: RowKind,
    transaction: Transaction,
  ): Promise<void> {
    try {
      await row.update(values, { transaction });
    } catch (error) {
      throw toFriendlyError(error, kind);
    }
  }
}

/** Только те поля DTO, которые реально прислали: отсутствие поля — не «очистить». */
function definedOnly<T extends object>(dto: T): Record<string, unknown> {
  return Object.fromEntries(Object.entries(dto).filter(([, value]) => value !== undefined));
}

/** Варианты есть только у списка: у остальных типов они не хранятся. */
const optionsFor = (type: FormFieldType, options: string[]): string[] =>
  type === FormFieldType.Select ? options.map((item) => item.trim()).filter(Boolean) : [];

function assertOptions(type: FormFieldType, options: string[]): void {
  if (type === FormFieldType.Select && options.length === 0) {
    throw new BadRequestException('У поля «Список» должен быть хотя бы один вариант');
  }
}

/**
 * Плоский снимок для журнала: ключи совпадают с полями формы в админке,
 * поэтому в истории видно «Подпись поля», а не «изменилась запись».
 */
function formSnapshot(form: Forms): Record<string, unknown> {
  return {
    code: form.code,
    name: form.name,
    description: form.description ?? null,
    notifyEmail: form.notifyEmail ?? '',
    successMessage: form.successMessage ?? null,
    submitLabel: form.submitLabel ?? '',
    isActive: form.isActive,
    position: form.position,
  };
}

function fieldSnapshot(field: FormFields): Record<string, unknown> {
  return {
    formId: field.formId,
    code: field.code,
    label: field.label,
    type: field.type,
    placeholder: field.placeholder ?? null,
    options: field.options ?? [],
    isRequired: field.isRequired,
    isActive: field.isActive,
    position: field.position,
  };
}

const toFriendlyError = (error: unknown, kind: RowKind): unknown => {
  if (error instanceof UniqueConstraintError) {
    return new ConflictException(
      kind === 'field'
        ? 'В этой форме уже есть поле с таким кодом'
        : 'Форма с таким кодом уже есть',
    );
  }
  return error;
};
