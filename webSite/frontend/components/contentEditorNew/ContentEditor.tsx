import { useState } from 'react';
import { Button, Segmented, Space } from 'antd';
import { DatabaseOutlined, DownloadOutlined, PlusOutlined, SettingOutlined } from '@ant-design/icons';
import { BackupsDrawer } from './backups';
import { ContentEditorDrawer, newRecord, standardFields, type EditorFields } from './drawer';
import { useRecord } from './drawer/useRecord';
import { useDrafts } from './drafts';
import { ExportDialog } from './export';
import { FilterPanel, useFilters } from './filters';
import { ListTitle } from './header';
import { ContentEditorHistory, useIsHistoryShown } from './history';
import { ContentEditorSettings, type BlockedSettings } from './settings';
import {
  ContentEditorTable,
  searchPlaceholder,
  standardColumns,
  useSearchFields,
  type EditorColumns,
  type EditorSettings,
  useBulkActions,
} from './table';
import { useLoadEditor, type EditorListApi } from './useLoadEditor';
import { useOpenRecord } from './useOpenRecord';
import { TabCount } from './ui';

/**
 * Новый редактор контента: шапка (заголовок списка, переключатель вида, кнопки),
 * плашка поиска и фильтра, таблица записей, карточка записи, настройки списка,
 * выгрузка в CSV и резервные копии списка.
 *
 * Раздел отдаёт редактору **код списка** и **Api** — это разные сущности:
 * кодом адресуются настройки списка и журнал, Api ведёт к самим записям.
 * Данные каждая часть берёт себе сама — таблица по Api, история по коду.
 */

/** Что показано: все записи, только записи с черновиком или журнал изменений списка. */
type EditorView = 'list' | 'drafts' | 'history';

export default function ContentEditor({
  listKey,
  api,
  settings,
  blockedSettings,
  columns = standardColumns,
  fields,
  recordPath,
}: {
  /** Код списка: `pages`, `content`, `infoblock-elements.3` */
  listKey: string;
  /** Где лежат записи */
  api: EditorListApi;
  /**
   * Как редактор показан: раскрытие дерева, подпись кнопки добавления, есть ли
   * журнал и кнопка «Настройки». Журнал виден, только если он включён
   * в настройках списка: `isHistoryHidden` убирает его и у включённого
   */
  settings?: EditorSettings;
  /**
   * Настройки списка, которые раздел задаёт сам: в окне они видны, но закрыты,
   * и их значение сильнее сохранённого. «Страницы» так закрывают древовидность,
   * код списка, мету записей и обязательность адреса.
   */
  blockedSettings?: BlockedSettings;
  /**
   * Колонки таблицы: поле записи → заголовок, ширина, сортировка, поиск
   * и своя логика значения. Не заданы — стандартные название, код и активность.
   */
  columns?: EditorColumns;
  /**
   * Поля карточки записи: поле → подпись, тип, пояснение. Код записи
   * и родителя редактор добавляет сам — по настройкам списка.
   */
  fields?: EditorFields;
  /**
   * Адрес записи, если в неё можно перейти: `:id` заменяется ключом записи
   * (`/admin/files/:id`). Задан — в строке появляется переход, и туда же ведёт
   * название. Карточка записи открывается, как и прежде, кликом по строке.
   */
  recordPath?: string;
}) {
  // Записи и настройки списка грузятся одним местом: части редактора их читают
  useLoadEditor({ listKey });

  // Что открыто и что выбрано — состояние самого экрана, не данные
  const [view, setView] = useState<EditorView>('list');
  // Открытая запись — в адресе страницы (`?id=7`), новая — только у себя
  const { record, open: setRecord, close: closeRecord } = useOpenRecord(listKey, api);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isBackupsOpen, setIsBackupsOpen] = useState(false);
  // Строка поиска стоит в шапке, а ищет таблица: набранное держим здесь
  const [query, setQuery] = useState('');
  // Фильтр: чипы в плашке над таблицей, отбирает таблица. Набор полей
  // общий и на сервере, выбранное — в адресе страницы
  const filter = useFilters(listKey, columns);

  // Корзина в строке таблицы удаляет запись, не открывая карточку
  const { remove } = useRecord(listKey, api);
  // Черновики включают в настройках списка: тогда есть вид «Черновики»
  // и значок публикации в строке
  const drafts = useDrafts(listKey, api);
  // Галочки в строках и действия над отмеченными — что умеет Api раздела
  const bulk = useBulkActions(listKey, api, fields ?? standardFields);

  const {
    addLabel = 'Добавить запись',
    isTitleHidden = false,
    isHistoryHidden = false,
    isListSettingsHidden = false,
    isExportHidden = false,
    isBackupShown = false,
  } = settings ?? {};

  // Журнал включают и выключают в настройках списка; раздел может убрать его
  // сам. Выключили, пока он был открыт, — возвращаемся к таблице
  const isHistoryShown = useIsHistoryShown(listKey, isHistoryHidden);
  // Выключили журнал или черновики, пока их вид был открыт, — к таблице
  const activeView: EditorView =
    (view === 'history' && !isHistoryShown) || (view === 'drafts' && !drafts.isDraftEnabled) ? 'list' : view;
  const isTableView = activeView !== 'history';
  const views = [
    { value: 'list', label: drafts.isDraftEnabled ? 'Все записи' : 'Таблица' },
    ...(drafts.isDraftEnabled
      ? [
          {
            value: 'drafts',
            label: (
              <span className="inline-flex items-center gap-1.5">
                Черновики
                <TabCount count={drafts.draftsCount} isActive={activeView === 'drafts'} />
              </span>
            ),
          },
        ]
      : []),
    ...(isHistoryShown ? [{ value: 'history', label: 'История изменений' }] : []),
  ];

  // Записи заводит только Api, у которого есть `create`
  const isAddable = api.create !== undefined;
  // Поиск — только в таблице: по номеру записи, коду и колонкам с `isSearch`
  const searchFields = useSearchFields(listKey, columns, blockedSettings);
  const searchHint = isTableView ? searchPlaceholder(searchFields) : null;
  // Фильтр — только у таблицы, и только если есть по чему: колонки раздела или свойства
  const isFilterable = isTableView && filter.fields.length > 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Шапка есть всегда: в таблице в ней хотя бы «Экспорт», если раздел его не убрал */}
      <div className="flex flex-wrap items-center gap-4">
        {!isTitleHidden && <ListTitle />}
        {views.length > 1 && (
          <Segmented
            value={activeView}
            options={views}
            onChange={(value) => setView(value as EditorView)}
          />
        )}
        {/* Кнопки прижаты вправо и тогда, когда слева ничего нет */}
        <Space className="ml-auto">
          {/* Выгружают таблицу — то, что отобрали поиском и фильтром */}
          {isTableView && !isExportHidden && (
            <Button icon={<DownloadOutlined />} onClick={() => setIsExportOpen(true)}>
              Экспорт
            </Button>
          )}
          {isBackupShown && (
            <Button icon={<DatabaseOutlined />} onClick={() => setIsBackupsOpen(true)}>
              Резервные копии
            </Button>
          )}
          {!isListSettingsHidden && (
            <Button icon={<SettingOutlined />} onClick={() => setIsSettingsOpen(true)}>
              Настройки
            </Button>
          )}
          {isAddable && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setRecord(newRecord())}>
              {addLabel}
            </Button>
          )}
        </Space>
      </div>

      <FilterPanel
        searchHint={searchHint}
        query={query}
        onQuery={setQuery}
        filter={isFilterable ? filter : null}
      />

      {isTableView ? (
        <ContentEditorTable
          listKey={listKey}
          settings={settings}
          blockedSettings={blockedSettings}
          columns={columns}
          recordPath={recordPath}
          query={query}
          filters={filter.entries}
          onOpen={setRecord}
          // Корзина — только у списка, Api которого записи удаляет
          onRemove={api.remove ? remove : undefined}
          // Публиковать — правкой раздела: без `update` черновик публиковать нечем
          onPublish={drafts.isDraftEnabled && api.update ? (row) => drafts.publishRows([row]) : undefined}
          isDraftView={activeView === 'drafts'}
          bulk={bulk}
        />
      ) : (
        <ContentEditorHistory
          listKey={listKey}
          api={api}
          fields={fields ?? standardFields}
          onOpen={setRecord}
        />
      )}

      <ContentEditorDrawer
        listKey={listKey}
        api={api}
        record={record}
        fields={fields}
        blockedSettings={blockedSettings}
        isHistoryShown={isHistoryShown}
        onClose={closeRecord}
      />

      <ExportDialog
        listKey={listKey}
        columns={columns}
        open={isExportOpen}
        onClose={() => setIsExportOpen(false)}
      />

      {isBackupShown && (
        <BackupsDrawer
          listKey={listKey}
          api={api}
          open={isBackupsOpen}
          onClose={() => setIsBackupsOpen(false)}
        />
      )}

      <ContentEditorSettings
        listKey={listKey}
        blockedSettings={blockedSettings}
        open={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}
