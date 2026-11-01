import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { UniqueConstraintError } from 'sequelize';
import { InfoblockProperty } from '../properties/property.model';
import { InfoblockSettingsService } from '../settings.service';
import { CreateInfoblockTabDto } from './create-tab.dto';
import { InfoblockTabDto } from './tab.dto';
import { InfoblockTab } from './tab.model';
import { UpdateInfoblockTabDto } from './update-tab.dto';

/** Шаг порядка: между соседними вкладками всегда есть куда вписать новую. */
const POSITION_STEP = 10;

/**
 * Вкладки карточки записи. Живут сами по себе, а не внутри настроек списка:
 * их заводят и убирают по одной, сразу — черновика у них нет.
 */
@Injectable()
export class InfoblockTabsService {
  constructor(
    @InjectModel(InfoblockTab) private readonly tabsRepo: typeof InfoblockTab,
    @InjectModel(InfoblockProperty) private readonly propertiesRepo: typeof InfoblockProperty,
    private readonly settingsService: InfoblockSettingsService,
  ) {}

  async findAll(listKey: string): Promise<InfoblockTabDto[]> {
    const settingsId = await this.settingsService.settingsId(listKey);
    if (settingsId === null) return [];

    const rows = await this.tabsRepo.findAll({
      where: { settingsId },
      order: [['position', 'ASC'], ['id', 'ASC']],
    });
    return rows.map(toDto);
  }

  /** Новая вкладка — в конец. Код собирается из названия, если его не прислали. */
  async create(
    listKey: string,
    dto: CreateInfoblockTabDto,
  ): Promise<InfoblockTabDto> {
    // Настройки у списка есть всегда: не сохраняли — заводим пустые
    const settingsId = await this.settingsService.ensureSettingsId(listKey);
    const rows = await this.tabsRepo.findAll({ where: { settingsId } });
    const code = dto.code?.trim() || uniqueCode(dto.name, rows.map((row) => row.code));
    const position =
      rows.reduce((max, row) => Math.max(max, row.position), 0) + POSITION_STEP;

    try {
      const created = await this.tabsRepo.create({ settingsId, code, name: dto.name, position });
      return toDto(created);
    } catch (error) {
      if (error instanceof UniqueConstraintError) {
        throw new ConflictException('Вкладка с таким кодом уже есть');
      }
      throw error;
    }
  }

  async rename(
    listKey: string,
    id: number,
    dto: UpdateInfoblockTabDto,
  ): Promise<InfoblockTabDto> {
    const tab = await this.findOwn(listKey, id);
    await tab.update({ name: dto.name });
    return toDto(tab);
  }

  /**
   * Удаление вкладки не трогает свойства: они возвращаются на общую «Свойства».
   * Значения записей тем более остаются — они хранятся по кодам свойств.
   */
  async remove(listKey: string, id: number): Promise<void> {
    const tab = await this.findOwn(listKey, id);
    await this.propertiesRepo.update(
      { tabId: null },
      { where: { settingsId: tab.settingsId, tabId: tab.id } },
    );
    await tab.destroy();
  }

  /** Вкладка этого списка; вкладку другого списка не отдаём. */
  private async findOwn(listKey: string, id: number): Promise<InfoblockTab> {
    const settingsId = await this.settingsService.settingsId(listKey);
    const tab = settingsId === null
      ? null
      : await this.tabsRepo.findOne({ where: { settingsId, id } });
    if (!tab) throw new NotFoundException('Вкладка не найдена');
    return tab;
  }
}

const toDto = (tab: InfoblockTab): InfoblockTabDto => ({
  id: tab.id,
  code: tab.code,
  name: tab.name,
});

/** Русские буквы в латиницу — то же правило, что у остальных кодов панели. */
const TRANSLIT: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i',
  й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't',
  у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '',
  э: 'e', ю: 'yu', я: 'ya',
};

/** Код из названия; занятый получает номер, пустой — «tab». */
function uniqueCode(name: string, taken: string[]): string {
  const base =
    name
      .trim()
      .toLowerCase()
      .split('')
      .map((char) => TRANSLIT[char] ?? char)
      .join('')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60)
      .replace(/-+$/g, '') || 'tab';

  if (!taken.includes(base)) return base;
  for (let suffix = 2; ; suffix += 1) {
    const candidate = `${base}-${suffix}`;
    if (!taken.includes(candidate)) return candidate;
  }
}
