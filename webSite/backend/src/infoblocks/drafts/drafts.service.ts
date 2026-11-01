import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { HistoryAuthor } from '../history/history.service';
import { assertRecordId, resolveInfoblock } from '../settings/infoblock-kinds';
import { InfoblockSettingsService } from '../settings/settings.service';
import { InfoblockDraft } from './draft.model';
import { RecordDraftDto, RecordDraftStateDto, SaveRecordDraftDto } from './dto/record-draft.dto';

/**
 * Черновики записей. Сервис только хранит их: применяет черновик тот, кто
 * публикует, — тем же сохранением раздела и значений, что и без черновика.
 * Поэтому здесь нет ни проверок полей, ни журнала: они сработают при публикации.
 */
@Injectable()
export class DraftsService {
  constructor(
    @InjectModel(InfoblockDraft) private readonly draftsRepo: typeof InfoblockDraft,
    private readonly settings: InfoblockSettingsService,
  ) {}

  /** Все черновики списка — для страницы таблицы: их немного, живут они до публикации. */
  async findAll(listKey: string): Promise<RecordDraftDto[]> {
    const settingsId = await this.settings.settingsId(resolveInfoblock(listKey).key);
    if (settingsId === null) return [];
    const drafts = await this.draftsRepo.findAll({ where: { settingsId } });
    return drafts.map(RecordDraftDto.from);
  }

  /** Черновик одной записи — карточке, открытой не со страницы таблицы. */
  async findOne(listKey: string, recordId: string): Promise<RecordDraftStateDto> {
    assertRecordId(recordId);
    const draft = await this.find(listKey, recordId);
    return { recordId, draft: draft ? RecordDraftDto.from(draft) : null };
  }

  /**
   * Сохранить черновик. Черновики бывают только у списка, где их включили:
   * иначе правка, сохранённая черновиком, ждала бы публикации, которой в этом
   * списке никто не предложит.
   */
  async save(
    listKey: string,
    recordId: string,
    dto: SaveRecordDraftDto,
    author: HistoryAuthor,
  ): Promise<RecordDraftDto> {
    const { key } = resolveInfoblock(listKey);
    assertRecordId(recordId);
    const settings = await this.settings.findOne(key);
    if (!settings.isDraftEnabled) {
      throw new BadRequestException('В этом списке черновики выключены');
    }

    const settingsId = await this.settings.ensureSettingsId(key);
    const existing = await this.draftsRepo.findOne({ where: { settingsId, recordKey: recordId } });
    const values = {
      fields: dto.fields,
      values: dto.values.map(({ propertyId, value }) => ({ propertyId, value })),
      authorId: author.id,
      // Черновик ассистента подписан им: «admin@… · MCP «Claude Code»»
      authorEmail: author.via ? `${author.email} · ${author.via}` : author.email,
    };

    const saved = existing
      ? // Новой запись бывает только с первого черновика: у опубликованной
        // флаг убрал бы её с сайта, а это решение публикации, а не правки
        await existing.update(values)
      : await this.draftsRepo.create({
          settingsId,
          recordKey: recordId,
          isNew: dto.isNew === true,
          ...values,
        });
    return RecordDraftDto.from(saved);
  }

  /**
   * Удалить черновик — запись возвращается к опубликованному. У записи,
   * которая ни разу не публиковалась, возвращаться не к чему: снять с неё
   * черновик значило бы выложить её на сайт мимо «Опубликовать».
   */
  async discard(listKey: string, recordId: string): Promise<void> {
    assertRecordId(recordId);
    const draft = await this.find(listKey, recordId);
    if (!draft) return;
    if (draft.isNew) {
      throw new ConflictException('Запись ещё не публиковалась: её можно только удалить целиком');
    }
    await draft.destroy();
  }

  /**
   * Черновик опубликован: его поля и значения уже записали маршрутами раздела
   * и значений, осталось убрать сам черновик. Новая запись с этого момента
   * видна на сайте.
   */
  async publish(listKey: string, recordId: string): Promise<void> {
    assertRecordId(recordId);
    const draft = await this.find(listKey, recordId);
    if (draft) await draft.destroy();
  }

  private async find(listKey: string, recordId: string): Promise<InfoblockDraft | null> {
    const settingsId = await this.settings.settingsId(resolveInfoblock(listKey).key);
    if (settingsId === null) return null;
    return this.draftsRepo.findOne({ where: { settingsId, recordKey: recordId } });
  }
}
