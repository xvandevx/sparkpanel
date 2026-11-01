import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Alert, Space, Table, Tag, Typography } from 'antd';
import {
  ArrowRightOutlined,
  CloudUploadOutlined,
  DeleteOutlined,
  EditOutlined,
  LockOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../redux';
import { emptyNewEditorList } from '../../../redux/reducers/contentEditorNewReducer';
import { isImageUrl } from '../../../logic/files';
import { isTreeDepth } from '../../../logic/listSettings';
import { DraftTag, draftedRow } from '../drafts';
import type { FilterEntry } from '../filters';
import { effectiveSettings, type BlockedSettings } from '../settings';
import { ActionIcon, FileThumb } from '../ui';
import { cellText, ColumnSettings, ID_COLUMN_KEY, mainColumnKey, useColumns } from './columns';
import PropertyCell from './PropertyCell';
import { useSearchFields } from './search';
import { usePropertyCells } from './usePropertyCells';
import BulkBar from './BulkBar';
import { BulkAction, type BulkActions } from './useBulkActions';
import { PAGE_SIZES, useRecordsPage, type PageSort } from './useRecordsPage';

/**
 * Таблица записей — страницами. Страницу, поиск, фильтр и сортировку ведёт
 * сервер (`useRecordsPage`): таблица показывает, что пришло. У дерева страница —
 * записи верхнего уровня, каждая со всей веткой: ветка страницей не рвётся.
 *
 * Колонки — не прямо из описания раздела, а по виду таблицы: пользователь
 * выбирает в шторке «Колонки таблицы», какие из колонок раздела и свойств
 * записей видны, в каком порядке и какой ширины. Не выбирал — видны
 * колонки раздела.
 */

/**
 * Как редактор показан: что в шапке и как раскрыто дерево. Устройство списка
 * сюда не входит: вкладываются ли записи друг в друга, решает настройка
 * «Уровней вложенности» — она хранится на сервере, и раздел либо закрывает
 * её (`blockedSettings`), либо не трогает.
 *
 * Строки поиска здесь нет: она есть всегда и ищет по номеру записи, коду
 * и колонкам с `isSearch` (`table/search.ts`). Заголовка тоже: это «Имя
 * списка» из его настроек.
 */
export interface EditorSettings {
  /**
   * Нет заголовка над списком: список встроен туда, где своё название уже есть, —
   * в шторку с заголовком или под крошки раздела
   */
  isTitleHidden?: boolean;
  /** Дерево показывается раскрытым; выключено — все ветки свёрнуты. По умолчанию раскрыто */
  isExpandedByDefault?: boolean;
  /** Подпись кнопки добавления: «Добавить раздел». По умолчанию «Добавить запись» */
  addLabel?: string;
  /**
   * Журнала нет, даже если он включён в настройках списка: ни переключателя
   * на него, ни вкладки «История» в карточке. Так журнал прячут от тех, кому
   * сервер его не отдаст
   */
  isHistoryHidden?: boolean;
  /** Нет кнопки «Настройки»: устройство и свойства списка не меняют из этого раздела */
  isListSettingsHidden?: boolean;
  /** Нет кнопки «Экспорт»: таблицу раздела в CSV не выгружают */
  isExportHidden?: boolean;
  /**
   * Есть кнопка «Резервные копии». Включает раздел сам: копии умеет не каждый
   * список — сервер знает таблицы только перечисленных у себя разделов
   */
  isBackupShown?: boolean;
}

/** Строка таблицы: ключ записи плюс всё, что пришло в записи. */
export interface EditorRow {
  id: string;
  /**
   * Запись нельзя удалить: её держит что-то вне списка — так раздел файлов
   * держит свойство записей, которое в него загружает. Флаг приходит с самой
   * записью от сервера, и сервер же не даст её удалить; редактор только
   * не предлагает корзину.
   */
  isBlocked?: boolean;
  /**
   * Запись только для показа: её собирает сервер, в базе её нет — так «Файлы»
   * показывают разделы свойств. Карточка не открывается, номера, правки
   * и галочки нет, родителем её не выбрать; перейти в неё (`recordPath`)
   * можно. Удаление закрывает `isBlocked`, сервер присылает оба флага.
   */
  isReadOnly?: boolean;
  /**
   * Запись — заголовок группы: только собирает вложенные, своего в ней
   * ничего нет, поэтому и перехода в неё нет. Приходит вместе с `isReadOnly`.
   */
  isGroup?: boolean;
  [key: string]: unknown;
}

/**
 * Ссылка в ячейке: открывается в новой вкладке, клик не открывает карточку
 * строки. Без адреса — просто текст.
 */
export interface EditorCellLink {
  text: string;
  href: string | null;
}

/** Описание одной колонки. Ключ в `EditorColumns` — поле записи. */
export interface EditorColumn {
  /** Заголовок колонки */
  name: string;
  /** Ширина колонки; не задана — antd считает сам */
  size?: number;
  /** Сортировать таблицу по этому полю */
  isSort?: boolean;
  /** Искать по этому полю; по номеру записи и коду строка поиска ищет и так */
  isSearch?: boolean;
  /**
   * Своя подпись значения: «Да / Нет», размер файла, дата. Ищут, фильтруют
   * и сортируют на сервере по самому полю записи — поэтому колонка с подписью
   * в фильтр не встаёт (кроме логических, `is…`: у них выбор «да / нет»),
   * а `isSort` и `isSearch` ей ставят, только если подпись — то же поле.
   * `rows` — записи страницы. Вместо текста может вернуть ссылки — в ячейке
   * они по одной на строку, в выгрузке и фильтре — их текст через «; »:
   * так «Файлы» ведут в записи, выбравшие файл.
   */
  logic?: (row: EditorRow, rows: EditorRow[]) => string | EditorCellLink[];
  /**
   * Значение — адрес файла: в ячейке превью (картинка или значок), клик
   * открывает файл в новой вкладке. Пустой адрес — пустая ячейка.
   */
  isPreview?: boolean;
  /**
   * Значение — метка: в ячейке оно `Tag` antd, а не текст. Так файлы показывают
   * хранилище, куда загружены. Пустое значение — пустая ячейка.
   */
  isTag?: boolean;
  /**
   * Значение — ссылка: поле записи с адресом (`url`), открывается в новой
   * вкладке, клик не открывает карточку строки. Так «Файлы» открывают файл
   * по его имени. Пустой адрес — просто текст.
   */
  linkField?: string;
  /**
   * Метка рядом со значением — цветной `Tag` antd, когда у записи логическое
   * поле `key` включено: так «Пользователи» отмечают главного администратора
   * у его email. Цвет — из набора antd (`gold`, `blue`…), своих цветов нет.
   */
  badge?: { key: string; name: string; color: string };
}

/** Колонки списка: поле записи → как его показать. Порядок ключей — порядок колонок. */
export type EditorColumns = Record<string, EditorColumn>;

/** Колонки по умолчанию: поля, которые есть у записи любого списка. */
export const standardColumns: EditorColumns = {
  name: { name: 'Название', size: 320, isSort: true, isSearch: true },
  code: { name: 'Код', size: 240, isSearch: true },
  isActive: {
    name: 'Активность',
    size: 140,
    logic: (row) => (row.isActive === false ? 'Нет' : 'Да'),
  },
  // По ней таблица упорядочена, пока не выбрали другую колонку
  sort: { name: 'Сортировка', size: 140, isSort: true },
};

export default function ContentEditorTable({
  listKey,
  settings = {},
  blockedSettings,
  columns = standardColumns,
  recordPath,
  query,
  filters,
  onOpen,
  onRemove,
  onPublish,
  bulk,
  isDraftView = false,
}: {
  /** Код списка: ячейка в сторе, настройки и журнал адресуются им */
  listKey: string;
  settings?: EditorSettings;
  /** Настройки, закрытые разделом: их значение сильнее сохранённого */
  blockedSettings?: BlockedSettings;
  columns?: EditorColumns;
  /** Адрес записи с `:id`, если в запись можно перейти */
  recordPath?: string;
  /** Что набрано в поиске шапки; пусто — показываем всё, деревом */
  query: string;
  /** Поля фильтра с тем, что в них выбрано: строка полей над таблицей */
  filters: FilterEntry[];
  /** Клик по строке: редактор открывает её карточку */
  onOpen: (row: EditorRow) => void;
  /** Корзина в строке: редактор спрашивает и удаляет запись. Нет — записи не удаляются */
  onRemove?: (row: EditorRow) => void;
  /** Значок в строке с черновиком: опубликовать его. Нет — черновики выключены */
  onPublish?: (row: EditorRow) => void;
  /** Вид «Черновики»: только записи с черновиком, плоским списком */
  isDraftView?: boolean;
  /** Быстрые действия над отмеченными записями; нет действий — нет и галочек */
  bulk?: BulkActions;
}) {
  const isExpandedByDefault = settings.isExpandedByDefault !== false;
  const router = useRouter();

  const list =
    useSelector((state: RootState) => state.contentEditorNew[listKey]) ?? emptyNewEditorList;

  // Что видно и в каком порядке — вид таблицы; шторка его правит
  const { shown, saved } = useColumns(listKey, columns);
  const propertyCell = usePropertyCells(listKey, shown);
  const [isColumnsOpen, setIsColumnsOpen] = useState(false);

  // Дерево строит не раздел, а настройка списка: раздел может её закрыть,
  // но не подменить собой
  const effective = effectiveSettings(list.settings, blockedSettings);
  // Дерево — это больше одного уровня вложенности; пока настроек нет, список плоский
  const isNested = effective !== null && isTreeDepth(effective.maxDepth);

  const searchFields = useSearchFields(listKey, columns, blockedSettings);
  // Номер записи сервер сверяет всегда — в поля поиска его не шлём
  const searchIn = useMemo(
    () => searchFields.map((field) => field.key).filter((key) => key !== 'id'),
    // Поля поиска — новым массивом на каждый рендер; следим за содержимым
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [searchFields.map((field) => field.key).join(',')],
  );

  const page = useRecordsPage({
    listKey,
    search: query,
    searchIn,
    filters,
    isTree: isNested,
    isDraft: isDraftView,
    isReady: saved !== null && list.filterKeys !== null,
  });
  const { isFiltered } = page;

  /** Строки страницы, как их видит редактор. */
  const flat = useMemo<EditorRow[]>(() => editorRows(page.items), [page.items]);

  /**
   * Найденное и отобранное фильтром сервер отдаёт плоским списком: в дереве
   * половина совпадений лежала бы внутри свёрнутых веток, и искать пришлось бы дважды.
   */
  const rows = useMemo<EditorRow[]>(
    () => (isNested && !isFiltered ? nestRows(flat) : flat),
    [flat, isFiltered, isNested],
  );

  /** Главная колонка: в ней ветки дерева и ссылка в запись, и она одна тянется. */
  const mainKey = mainColumnKey(
    shown.map((item) => item.key),
    columns,
  );
  const mainIndex = Math.max(0, shown.findIndex((item) => item.key === mainKey));

  /** Сортировка колонки — та, что сейчас у сервера, иначе стрелка врала бы. */
  const sortOrderOf = (key: string) =>
    page.sort?.key === key ? (page.sort.order === 'asc' ? ('ascend' as const) : ('descend' as const)) : null;

  /** Строки, у которых есть вложенные: только они раскрываются. */
  const expandableKeys = useMemo(() => expandableRowKeys(rows), [rows]);
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  /** Уже раскрытые хотя бы раз: свёрнутое пользователем обратно не раскрываем */
  const autoExpanded = useRef(new Set<string>());

  useEffect(() => {
    if (!isExpandedByDefault) return;
    const fresh = expandableKeys.filter((key) => !autoExpanded.current.has(key));
    if (fresh.length === 0) return;
    fresh.forEach((key) => autoExpanded.current.add(key));
    setExpandedKeys((prev) => [...prev, ...fresh]);
  }, [expandableKeys, isExpandedByDefault]);

  // Отмеченные — только на показанной странице: перелистнули или нашли другое —
  // отметка с ушедших строк снимается, чтобы не задеть невидимое. Та же страница,
  // перечитанная заново, отметку не теряет
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  useEffect(() => {
    const shown = new Set(flat.map((row) => row.id));
    setSelectedKeys((prev) => (prev.every((id) => shown.has(id)) ? prev : prev.filter((id) => shown.has(id))));
  }, [flat]);
  const selectedRows = flat.filter((row) => selectedKeys.includes(row.id));
  const isSelectable = bulk !== undefined && bulk.actions.length > 0;
  const [runningAction, setRunningAction] = useState<BulkAction | null>(null);

  const runBulk = async (action: BulkAction) => {
    if (!bulk) return;
    setRunningAction(action);
    const isChanged = await bulk.run(action, selectedRows, flat);
    setRunningAction(null);
    if (isChanged) setSelectedKeys([]);
  };

  if (page.error) return <Alert type="error" showIcon message={page.error} />;

  return (
    // Один блок: плавающая панель — не отдельный элемент в колонке редактора,
    // иначе колонка добавила бы под таблицей ещё свой отступ
    <div>
      <Table
        rowKey="id"
        size="middle"
        // Ширины колонок — точно как заданы (в разделе или в «Колонках таблицы»):
        // при раскладке «auto» antd подгоняет их под содержимое, и узкие колонки
        // (галочки, ID) у каждой таблицы выходили своей ширины
        tableLayout="fixed"
        // Пока вид таблицы и фильтр не пришли, страницу не спрашиваем: колонки
        // ещё могут поменяться, а весь список мелькнул бы перед отобранным
        loading={page.isLoading}
        dataSource={rows}
        columns={[
          ...shown.map(({ key, name, width, column, property }) => ({
            key,
            title: name,
            // Главная колонка без ширины — она забирает свободное место
            width: key === mainKey ? undefined : width,
            sorter: column?.isSort === true,
            sortOrder: column?.isSort === true ? sortOrderOf(key) : undefined,
            // По умолчанию таблица и так по ID, новые сверху: первый клик — старые сверху
            ...(key === ID_COLUMN_KEY ? { sortDirections: ['descend' as const, 'ascend' as const] } : {}),
            // В ячейках — то, что сейчас в карточке: черновик поверх опубликованного
            render: (_: unknown, published: EditorRow) =>
              ((row: EditorRow) =>
              key === ID_COLUMN_KEY ? (
                // Запись только для показа сервер собирает сам — номера в базе у неё нет
                row.isReadOnly === true ? null : <Typography.Text type="secondary">{row.id}</Typography.Text>
              ) : property ? (
                <PropertyCell content={propertyCell(property, row.id)} />
              ) : column.isPreview ? (
                <FilePreview url={cellText(key, column, row, flat)} />
              ) : column.isTag ? (
                <CellTag text={cellText(key, column, row, flat)} />
              ) : column.linkField !== undefined ? (
                <CellLinks
                  links={[
                    {
                      text: cellText(key, column, row, flat),
                      href: String(row[column.linkField] ?? '') || null,
                    },
                  ]}
                />
              ) : column.logic !== undefined && Array.isArray(column.logic(row, flat)) ? (
                <CellLinks links={column.logic(row, flat) as EditorCellLink[]} />
              ) : (
                <>
                  {
                    // В запись, куда можно перейти, ведёт первая колонка после номера —
                    // её название. Клик мимо ссылки, как и везде, открывает карточку
                    recordPath !== undefined && key === mainKey && row.isGroup !== true ? (
                      <Link
                        href={recordHref(recordPath, row.id)}
                        onClick={(event) => event.stopPropagation()}
                      >
                        {cellText(key, column, row, flat)}
                      </Link>
                    ) : (
                      cellText(key, column, row, flat)
                    )
                  }
                  {column.badge !== undefined && row[column.badge.key] === true && (
                    <Tag color={column.badge.color} style={{ marginInlineStart: 8 }}>
                      {column.badge.name}
                    </Tag>
                  )}
                  {key === mainKey && <DraftTag draft={list.drafts[row.id]} />}
                </>
              ))(draftedRow(published, list.drafts[published.id], { isParentShown: false })),
          })),
          {
            key: 'actions',
            // Над значками действий — настройка колонок: место есть всегда,
            // и шапку раздела она не занимает
            title: (
              <ActionIcon
                title="Настроить колонки"
                icon={<SettingOutlined />}
                onClick={() => setIsColumnsOpen(true)}
              />
            ),
            // Под каждый значок действия — 28 px
            width: 80 + (recordPath === undefined ? 0 : 28) + (onPublish === undefined ? 0 : 28),
            // Действия прижаты к правому краю таблицы: так они стоят одной
            // линией и не плавают вслед за шириной остальных колонок
            align: 'right' as const,
            render: (_: unknown, row: EditorRow) => (
              <Space size={4}>
                {recordPath !== undefined && row.isGroup !== true && (
                  <ActionIcon
                    title="Перейти в запись"
                    icon={<ArrowRightOutlined />}
                    onClick={() => router.push(recordHref(recordPath, row.id))}
                  />
                )}
                {onPublish !== undefined && list.drafts[row.id] && (
                  <ActionIcon
                    title="Опубликовать черновик"
                    icon={<CloudUploadOutlined />}
                    onClick={() => onPublish(row)}
                  />
                )}
                {row.isReadOnly !== true && (
                  <ActionIcon
                    title="Изменить запись"
                    icon={<EditOutlined />}
                    onClick={() => onOpen(row)}
                  />
                )}
                {onRemove === undefined ? null : row.isBlocked === true ? (
                  <ActionIcon title="Запись защищена от удаления" icon={<LockOutlined />} isDisabled />
                ) : (
                  <ActionIcon
                    title="Удалить запись"
                    icon={<DeleteOutlined />}
                    isDanger
                    onClick={() => onRemove(row)}
                  />
                )}
              </Space>
            ),
          },
        ]}
        rowSelection={
          isSelectable
            ? {
                selectedRowKeys: selectedKeys,
                onChange: (keys) => setSelectedKeys(keys.map(String)),
                // У дерева галочки независимы: отметили раздел — его ветка не отмечается
                checkStrictly: true,
                columnWidth: 48,
                getCheckboxProps: (row) => ({ disabled: row.isReadOnly === true }),
              }
            : undefined
        }
        onRow={(row) => (row.isReadOnly === true ? {} : { onClick: () => onOpen(row) })}
        expandable={{
          // Ветки раскрываются в главной колонке: отступы дерева — у названия.
          // С галочками antd считает в номерах ещё две свои служебные колонки
          // (проверено в браузере), без поправки отступы уезжают к галочкам или к ID
          expandIconColumnIndex: mainIndex + (isSelectable ? 2 : 0),
          expandedRowKeys: expandedKeys,
          onExpandedRowsChange: (keys) => setExpandedKeys(keys.map(String)),
        }}
        // Листалка — когда есть что листать: у короткого списка она только мешает
        pagination={
          page.total > PAGE_SIZES[0] && {
            current: page.page,
            pageSize: page.pageSize,
            total: page.total,
            showSizeChanger: true,
            pageSizeOptions: PAGE_SIZES,
            showTotal: (total) => (isNested && !isFiltered ? `Верхнего уровня: ${total}` : `Всего: ${total}`),
          }
        }
        onChange={(pagination, _filters, sorter) => {
          const one = Array.isArray(sorter) ? sorter[0] : sorter;
          const sort: PageSort | null =
            one?.order && one.columnKey !== undefined
              ? { key: String(one.columnKey), order: one.order === 'ascend' ? 'asc' : 'desc' }
              : null;
          page.change({
            page: pagination.current ?? 1,
            pageSize: pagination.pageSize ?? page.pageSize,
            sort,
          });
        }}
        locale={{ emptyText: isFiltered ? 'Ничего не нашлось' : 'Записей пока нет' }}
      />

      {/* Действия над отмеченными — плавающей панелью у нижнего края, пока что-то отмечено */}
      {isSelectable && selectedRows.length > 0 && (
        <BulkBar
          count={selectedRows.length}
          actions={bulk.actions}
          runningAction={runningAction}
          onRun={runBulk}
          onClear={() => setSelectedKeys([])}
        />
      )}

      <ColumnSettings
        listKey={listKey}
        columns={columns}
        open={isColumnsOpen}
        onClose={() => setIsColumnsOpen(false)}
      />
    </div>
  );
}

/** Ссылки колонки — по одной на строку, каждая в новой вкладке. */
function CellLinks({ links }: { links: EditorCellLink[] }) {
  return (
    <div className="flex flex-col">
      {links.map((link, index) =>
        link.href === null ? (
          <span key={index}>{link.text}</span>
        ) : (
          <a
            key={index}
            href={link.href}
            target="_blank"
            rel="noreferrer"
            onClick={(event) => event.stopPropagation()}
          >
            {link.text}
          </a>
        ),
      )}
    </div>
  );
}

/** Значение колонки с `isTag` — меткой; пустое — пустая ячейка. */
function CellTag({ text }: { text: string }) {
  return text === '' ? null : <Tag>{text}</Tag>;
}

/** Превью файла ссылкой: клик открывает файл, а не карточку записи. */
function FilePreview({ url }: { url: string }) {
  if (url === '') return null;
  // Картинку смотрят на весь экран прямо здесь, остальное открывается в новой вкладке
  if (isImageUrl(url)) return <FileThumb url={url} isImage />;
  return (
    <a href={url} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>
      <FileThumb url={url} isImage={false} />
    </a>
  );
}

/** Адрес записи: `:id` в шаблоне раздела — ключ записи. */
const recordHref = (path: string, id: string): string => path.replace(':id', encodeURIComponent(id));

/**
 * Плоский список в дерево по `parentId`: вложенность antd рисует сам, по полю
 * `children` строки. Записи с неизвестным родителем остаются в корне — список
 * показываем целиком, терять строки из-за битой ссылки нельзя.
 */
const nestRows = (flat: EditorRow[]): EditorRow[] => {
  const byId = new Map<string, EditorRow & { children: EditorRow[] }>();
  flat.forEach((row) => byId.set(row.id, { ...row, children: [] }));

  const roots: (EditorRow & { children: EditorRow[] })[] = [];
  byId.forEach((row) => {
    const parent = typeof row.parentId === 'string' ? byId.get(row.parentId) : undefined;
    if (parent && parent !== row) parent.children.push(row);
    else roots.push(row);
  });

  // Пустой `children` antd показывает как раскрывающуюся строку — убираем
  const prune = (rows: EditorRow[]): EditorRow[] =>
    rows.map((row) => {
      const children = (row.children as EditorRow[] | undefined) ?? [];
      if (children.length > 0) return { ...row, children: prune(children) };
      const { children: _empty, ...rest } = row;
      return rest;
    });

  return prune(roots);
};

/** Ключи строк с вложенными — сверху вниз по всему дереву. */
const expandableRowKeys = (rows: EditorRow[]): string[] =>
  rows.flatMap((row) => {
    const children = (row.children as EditorRow[] | undefined) ?? [];
    return children.length > 0 ? [row.id, ...expandableRowKeys(children)] : [];
  });

/**
 * Записи Api — в строки редактора. Ключ записи и ключ родителя у редактора
 * строковые, как в адресе админки: по ним сходятся таблица, карточка и выбор
 * родителя, и сравнивать числа со строками не приходится.
 */
export const editorRows = (items: unknown[]): EditorRow[] =>
  items.map((item) => {
    const record = item as Record<string, unknown>;
    return {
      ...record,
      id: String(record.id),
      parentId:
        record.parentId === undefined || record.parentId === null
          ? null
          : String(record.parentId),
    };
  });
