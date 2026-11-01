import { BadRequestException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { Op, Transaction } from 'sequelize';
import { HistoryAction } from '../history/history.model';
import { HistoryAuthor, HistoryService } from '../history/history.service';
import { assertRecordCode } from '../settings/record-code';
import { InfoblockSettings } from '../settings/settings.model';
import { depthError } from '../settings/tree-depth';
import { PAGE_URL_PROPERTY } from '../settings/properties/system-properties';
import { PropertyValueMap } from '../settings/properties/property';
import { PropertyValuesService, ValuesCheck } from '../values/property-values.service';
import { DEFAULT_SORT } from '../record-sort';
import { CreatePageDto, PAGE_CODE_PATTERN, PAGE_URL_MESSAGE } from './dto/create-page.dto';
import { PageDto } from './dto/page.dto';
import { UpdatePageDto } from './dto/update-page.dto';
import { Pages } from './pages.model';

/** Тип записи в журнале изменений — общий журнал раздела читается по нему же. */
export const PAGES_ENTITY = 'pages';

/** Сегменты адреса страниц пользователя: ключ записи → сегмент. */
type PageUrls = Map<string, string>;

@Injectable()
export class PagesService implements OnModuleInit {
  constructor(
    @InjectModel(Pages) private readonly pageRepo: typeof Pages,
    // Настройки списка только читаются: предел вложенности
    @InjectModel(InfoblockSettings) private readonly settingsRepo: typeof InfoblockSettings,
    @InjectConnection() private readonly sequelize: Sequelize,
    private readonly historyService: HistoryService,
    // Адрес страницы — значение свойства «Адрес»: читаем его и проверяем правку
    private readonly values: PropertyValuesService,
  ) {}

  onModuleInit(): void {
    this.values.registerCheck(PAGES_ENTITY, this.checkUrl);
  }

  /**
   * Список всех страниц пользователя. Корней может быть несколько: страница без
   * родителя — это главная, а главных бывает больше одной (разные домены, тесты).
   */
  async findAll(): Promise<PageDto[]> {
    const pages = await this.pageRepo.findAll({
      order: [
        ['sort', 'ASC'],
        ['id', 'ASC'],
      ],
    });

    const paths = pagePaths(pages, await this.urls());
    return pages.map((page) => PageDto.from(page, paths.get(page.id) ?? ROOT_PATH));
  }

  async findOne(id: number): Promise<PageDto> {
    return this.toDto(await this.getOwnPage(id));
  }

  async create(userId: number, dto: CreatePageDto, author: HistoryAuthor): Promise<PageDto> {
    const parentId = dto.parentId ?? null;
    if (parentId !== null) await this.getOwnPage(parentId);
    await this.assertDepth(null, parentId);
    await this.assertCode(null, dto.code ?? '');

    // Адреса у новой страницы ещё нет: он приходит вторым запросом, значением
    // свойства, и там же проверяется
    const page = await this.sequelize.transaction(async (transaction) => {
      const created = await this.pageRepo.create(
        {
          userId,
          parentId,
          code: dto.code ?? '',
          name: dto.name,
          isActive: dto.isActive ?? true,
          sort: dto.sort ?? DEFAULT_SORT,
        },
        { transaction },
      );

      await this.historyService.record({
        userId,
        entity: PAGES_ENTITY,
        entityId: String(created.id),
        entityCode: created.code,
        entityName: created.name,
        action: HistoryAction.Create,
        after: snapshot(created),
        author,
        transaction,
      });

      return created;
    });

    return this.toDto(page);
  }

  async update(
    userId: number,
    id: number,
    dto: UpdatePageDto,
    author: HistoryAuthor,
  ): Promise<PageDto> {
    const page = await this.getOwnPage(id);
    const before = snapshot(page);

    if (dto.parentId !== undefined && dto.parentId !== page.parentId) {
      await this.assertCanMove(page, dto.parentId);
      await this.assertDepth(page.id, dto.parentId);
      // Адрес не правили, а соседи у него новые: перенос главной страницы
      // внутрь другой или в ветку с тем же адресом иначе проходил бы без проверки
      const urls = await this.urls();
      await this.assertUrl(page.id, urls.get(String(page.id)) ?? '', dto.parentId, urls);
    }
    await this.assertCode(page.id, dto.code ?? page.code ?? '');

    await this.sequelize.transaction(async (transaction) => {
      await page.update(
        {
          ...(dto.parentId !== undefined ? { parentId: dto.parentId } : {}),
          ...(dto.code !== undefined ? { code: dto.code } : {}),
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
          ...(dto.sort !== undefined ? { sort: dto.sort } : {}),
        },
        { transaction },
      );

      await this.historyService.record({
        userId,
        entity: PAGES_ENTITY,
        entityId: String(page.id),
        entityCode: page.code,
        entityName: page.name,
        action: HistoryAction.Update,
        before,
        after: snapshot(page),
        author,
        transaction,
      });
    });

    return this.toDto(page);
  }

  /**
   * Удаление страницы вместе со всем поддеревом: висячих детей без родителя
   * в плоском дереве быть не должно.
   */
  async remove(userId: number, id: number, author: HistoryAuthor): Promise<{ removed: number }> {
    const page = await this.getOwnPage(id);

    const all = await this.pageRepo.findAll();
    const subtree = collectSubtree(all, page.id);

    await this.sequelize.transaction(async (transaction) => {
      for (const item of subtree) {
        await this.historyService.record({
          userId,
          entity: PAGES_ENTITY,
          entityId: String(item.id),
          entityCode: item.code,
          entityName: item.name,
          action: HistoryAction.Delete,
          before: snapshot(item),
          author,
          transaction,
        });
      }

      await this.pageRepo.destroy({
        where: { id: subtree.map((item) => item.id) },
        transaction,
      });
    });
    // Значения свойств — адрес, текст — уходят вместе со страницами
    await this.values.remove(PAGES_ENTITY, subtree.map((item) => String(item.id)));

    return { removed: subtree.length };
  }

  findHistory(id: number) {
    return this.historyService.findByEntityId(PAGES_ENTITY, String(id));
  }

  findJournal(limit: number, offset: number) {
    return this.historyService.findByEntity(PAGES_ENTITY, limit, offset);
  }

  /** Правка свойства «Адрес» — та же проверка, что и при переносе страницы. */
  private readonly checkUrl: ValuesCheck = async ({ recordId, touched, values, transaction }) => {
    if (!touched.includes(PAGE_URL_PROPERTY)) return;
    const page = await this.pageRepo.findOne({ where: { id: Number(recordId) }, transaction });
    if (!page) throw new NotFoundException('Страница не найдена');
    await this.assertUrl(page.id, urlOf(values), page.parentId, await this.urls(transaction));
  };

  /**
   * Сегмент адреса: строчные латинские, цифры и дефис. Пустой — главная
   * страница, а главная бывает только в корне: у вложенной без сегмента адрес
   * совпал бы с родительским. Среди соседей сегмент уникален — из сегментов
   * собирается адрес; у корневых пустой не в счёт: несколько главных живут
   * рядом, их разводит домен, а не адрес.
   */
  private async assertUrl(
    id: number,
    url: string,
    parentId: number | null,
    urls: PageUrls,
  ): Promise<void> {
    if (!PAGE_CODE_PATTERN.test(url)) throw new BadRequestException(PAGE_URL_MESSAGE);
    if (parentId !== null && url === '') {
      throw new BadRequestException(
        'Адрес вложенной страницы не может быть пустым: он совпадёт с адресом родителя',
      );
    }
    if (url === '') return;

    const siblings = await this.pageRepo.findAll({
      attributes: ['id'],
      where: { parentId, id: { [Op.ne]: id } },
    });
    if (siblings.some((sibling) => urls.get(String(sibling.id)) === url)) {
      throw new BadRequestException('В этом разделе уже есть страница с таким адресом');
    }
  }

  /** Сегменты адреса всех страниц пользователя — из значений свойства «Адрес». */
  private async urls(transaction?: Transaction): Promise<PageUrls> {
    const values = await this.values.codeValues(PAGES_ENTITY, transaction);
    return new Map(Array.from(values, ([recordId, record]) => [recordId, urlOf(record)]));
  }

  /** Код страницы — по настройке списка «Символьный код записей»: к адресу он не относится. */
  private async assertCode(id: number | null, code: string): Promise<void> {
    const settings = await this.settingsRepo.findOne({ where: { listKey: PAGES_ENTITY } });
    await assertRecordCode(settings, code, async (value) => {
      const count = await this.pageRepo.count({
        where: { code: value, ...(id === null ? {} : { id: { [Op.ne]: id } }) },
      });
      return count > 0;
    });
  }

  /** Страница наружу — с полным адресом: он складывается из сегментов родителей. */
  private async toDto(page: Pages): Promise<PageDto> {
    const all = await this.pageRepo.findAll();
    return PageDto.from(page, pagePaths(all, await this.urls()).get(page.id) ?? ROOT_PATH);
  }

  private async getOwnPage(id: number): Promise<Pages> {
    const page = await this.pageRepo.findOne({ where: { id } });
    if (!page) throw new NotFoundException('Страница не найдена');
    return page;
  }

  /**
   * Предел вложенности — настройка «Уровней вложенности» списка `pages`.
   * Предела по умолчанию у страниц нет, поэтому читается только сохранённый:
   * через реестр видов списков нельзя — он сам берёт `PAGES_ENTITY` отсюда.
   */
  private async assertDepth(id: number | null, parentId: number | null): Promise<void> {
    const settings = await this.settingsRepo.findOne({ where: { listKey: PAGES_ENTITY } });
    const maxDepth = settings?.maxDepth ?? null;
    if (maxDepth === null) return;

    const all = await this.pageRepo.findAll();
    const error = depthError(new Map(all.map((page) => [page.id, page.parentId])), id, parentId, maxDepth);
    if (error) throw new BadRequestException(error);
  }

  /** Перенос допустим куда угодно, кроме себя самой и собственного поддерева. */
  private async assertCanMove(
    page: Pages,
    parentId: number | null,
  ): Promise<void> {
    if (parentId === null) return;
    if (parentId === page.id) {
      throw new BadRequestException('Страница не может быть родителем самой себе');
    }
    await this.getOwnPage(parentId);

    const all = await this.pageRepo.findAll();
    const subtreeIds = new Set(collectSubtree(all, page.id).map((item) => item.id));
    if (subtreeIds.has(parentId)) {
      throw new BadRequestException('Страницу нельзя перенести внутрь её собственной ветки');
    }
  }
}

/** Адрес корня сайта. */
const ROOT_PATH = '/';

/** Сегмент адреса из значений страницы: свойство «Адрес», пусто — главная. */
const urlOf = (values: PropertyValueMap | undefined): string =>
  String(values?.[PAGE_URL_PROPERTY] ?? '').trim();

/**
 * Полные адреса страниц: сегменты от корня сайта (`/catalog/towbars`). Пустой
 * сегмент в цепочке пропускается — так страницы под главной получают адреса
 * от корня. Кольцо в родителях не зацикливает.
 */
export function pagePaths(pages: Pages[], urls: PageUrls): Map<number, string> {
  const byId = new Map(pages.map((page) => [page.id, page]));
  return new Map(
    pages.map((page) => {
      const segments: string[] = [];
      const seen = new Set<number>();
      let current: Pages | undefined = page;
      while (current && !seen.has(current.id)) {
        seen.add(current.id);
        const segment = urls.get(String(current.id)) ?? '';
        if (segment) segments.unshift(segment);
        current = current.parentId === null ? undefined : byId.get(current.parentId);
      }
      return [page.id, `${ROOT_PATH}${segments.join('/')}`];
    }),
  );
}

/** Страница и всё, что под ней: от самой глубокой ветки к корню поддерева. */
export function collectSubtree(all: Pages[], rootId: number): Pages[] {
  const childrenByParent = new Map<number, Pages[]>();
  for (const page of all) {
    // 0 — служебный ключ корня: настоящих идентификаторов с нуля не бывает
    const key = page.parentId ?? 0;
    const list = childrenByParent.get(key) ?? [];
    list.push(page);
    childrenByParent.set(key, list);
  }

  const root = all.find((page) => page.id === rootId);
  if (!root) return [];

  const result: Pages[] = [];
  const walk = (page: Pages) => {
    for (const child of childrenByParent.get(page.id) ?? []) walk(child);
    result.push(page);
  };
  walk(root);

  return result;
}

/**
 * Плоский снимок для журнала: ключи совпадают с полями формы в админке,
 * поэтому в истории видно «name», а не «изменилась страница».
 */
function snapshot(page: Pages): Record<string, unknown> {
  return {
    code: page.code ?? '',
    name: page.name,
    isActive: page.isActive,
    sort: page.sort,
    parentId: page.parentId ?? null,
  };
}
