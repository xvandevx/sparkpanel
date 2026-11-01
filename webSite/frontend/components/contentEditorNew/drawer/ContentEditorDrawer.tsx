import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, App, Badge, Button, Drawer, Form, Segmented, Space, Tabs } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../redux';
import { emptyNewEditorList } from '../../../redux/reducers/contentEditorNewReducer';
import { formatDateTime } from '../../../logic/dateFormat';
import {
  DraftBlock,
  DraftTag,
  draftedKeys,
  draftedRow,
  draftedValues,
  draftValueItems,
  useDrafts,
  useRecordDraft,
} from '../drafts';
import { ClearHistoryButton, RecordHistory } from '../history';
import { recordRules, type BlockedSettings } from '../settings';
import type { EditorRow } from '../table';
import type { EditorListApi } from '../useLoadEditor';
import RecordDates from './RecordDates';
import RecordFields from './RecordFields';
import { MAIN_TAB, cardTabs, fieldValuesOf, propertyValuesOf } from './propertyFields';
import {
  cardFields,
  changedValues,
  draftError,
  draftOf,
  parentOptions,
  payloadOf,
  standardFields,
  type EditorFields,
  type RecordDraft,
} from './record';
import { useCardRows, useRecord, useRecordValues } from './useRecord';
import { FORM_LAYOUT } from '../ui';

/**
 * Карточка записи: шторка на 70% ширины экрана — слева остаётся видна таблица.
 * Открывается кликом по строке и карандашом в ней, пустая — кнопкой «Добавить».
 *
 * Поля перечисляет раздел — данными, а не разметкой. Код записи и родителя
 * добавляет сам редактор, по настройкам списка: это не поля раздела, а правила
 * списка, и живут они в «Настройках».
 *
 * Свойства записей встают рядом — по вкладкам карточки, как их разложили
 * в настройках. Запись и её значения это две сущности и два запроса: сначала
 * сохраняется запись, потом значения её свойств — у новой записи ключ,
 * под которым их писать, появляется только после первого.
 *
 * У списка с черновиками карточка показывает одну из двух версий записи —
 * «Черновик» (опубликованное, поверх — черновик) или «Опубликовано». Кнопка
 * в шапке сохраняет показанную: черновиком или сразу на сайт. Черновик — это
 * отложенное сохранение: его публикация — то же сохранение раздела и значений.
 */

export default function ContentEditorDrawer({
  listKey,
  api,
  record,
  fields = standardFields,
  blockedSettings,
  isHistoryShown = false,
  onClose,
}: {
  /** Код списка: по нему шторка читает настройки и значения свойств */
  listKey: string;
  /** Где лежат записи: шторка сохраняет и удаляет открытую */
  api: EditorListApi;
  /** Открытая запись; null — шторка закрыта, запись без `id` — новая */
  record: EditorRow | null;
  /** Поля записи, какие описал раздел */
  fields?: EditorFields;
  /** Настройки, закрытые разделом: их значение сильнее сохранённого */
  blockedSettings?: BlockedSettings;
  /** Журнал списка включён и виден: у сохранённой записи есть вкладка «История» */
  isHistoryShown?: boolean;
  onClose: () => void;
}) {
  const { message, modal } = App.useApp();
  const entry =
    useSelector((state: RootState) => state.contentEditorNew[listKey]) ?? emptyNewEditorList;
  const { isSaving: isRecordSaving, save, saveValues, remove } = useRecord(listKey, api);
  const {
    isDraftEnabled,
    drafts,
    isBusy: isDraftBusy,
    save: saveDraft,
    discard: discardDraft,
    publishRows: publishDrafts,
  } = useDrafts(listKey, api);
  const isSaving = isRecordSaving || isDraftBusy;

  // Закрытые разделом настройки раскладываем по значениям: раздел задаёт их
  // литералом, и у объекта каждый раз новая ссылка
  const {
    maxDepth: blockedDepth,
    codeMode: blockedCodeMode,
  } = blockedSettings ?? {};

  /**
   * Правила записей: закрытое разделом известно сразу, остальное — из настроек
   * списка. Настройки приходят своим запросом, и карточку могут открыть раньше
   * их ответа — поэтому правила, а не настройки целиком.
   */
  const rules = useMemo(
    () =>
      recordRules(entry.settings, {
        maxDepth: blockedDepth,
        codeMode: blockedCodeMode,
      }),
    [entry.settings, blockedDepth, blockedCodeMode],
  );

  /** Поля самой записи: раздела плюс код и родитель из настроек списка. */
  const cardOf = useMemo(() => cardFields(fields, rules), [fields, rules]);

  /** Вкладки карточки со свойствами записей; первая — «Запись». */
  const tabs = useMemo(
    () => cardTabs(entry.tabs, entry.properties),
    [entry.tabs, entry.properties],
  );

  /** Все свойства одним набором: по нему собираются черновик и тело запроса. */
  const propertyFields = useMemo<EditorFields>(
    () => Object.assign({}, ...tabs.map((tab) => tab.fields)),
    [tabs],
  );

  const hasProperties = entry.properties.length > 0 || entry.tabs.length > 0;

  /** История — у сохранённой записи: у новой правок ещё не было */
  const isHistoryTab = isHistoryShown && record !== null && !isNew(record);

  /**
   * Править запись можно, если Api это умеет: без `update` карточка открывается
   * на просмотр — поля закрыты, «Сохранить» нет. Значения свойств тоже не правятся:
   * их сохранение идёт следом за записью.
   */
  const isEditable =
    record !== null && (isNew(record) ? api.create !== undefined : api.update !== undefined);

  const [draft, setDraft] = useState<RecordDraft | null>(null);
  const [values, setValues] = useState<RecordDraft | null>(null);

  // Открытая вкладка — чтобы показывать «Очистить историю» только на «Истории».
  // Другая запись открывается с первой вкладки
  const [activeTab, setActiveTab] = useState<string>(MAIN_TAB);
  useEffect(() => {
    setActiveTab(MAIN_TAB);
  }, [record?.id]);

  // Номер показа истории: очистили — вкладка пересобирается и читает журнал заново
  const [historyVersion, setHistoryVersion] = useState(0);

  // Поля держим в ссылке: раздел описывает их литералом, и у него каждый
  // раз новая ссылка — в зависимостях эффекта она стирала бы набранное
  const cardRef = useRef(cardOf);
  cardRef.current = cardOf;
  const propertyRef = useRef(propertyFields);
  propertyRef.current = propertyFields;

  /** Набор полей карточки: пришли настройки — в нём появляются «Код» и «Родитель». */
  const cardKeys = Object.keys(cardOf).join(',');
  const propertyKeys = Object.keys(propertyFields).join(',');

  /** Значения свойств открытой записи, как они лежат в базе, — по ключам полей карточки. */
  const savedValues = useMemo(
    () => (record === null || isNew(record) ? {} : fieldValuesOf(entry.values[record.id] ?? {})),
    [entry.values, record],
  );

  // Черновик открытой записи: со страницы таблицы он уже пришёл, запись
  // не со страницы (из журнала) догружает свой
  const recordKey = record === null || isNew(record) ? null : record.id;
  const isDraftKnown = useRecordDraft(listKey, isDraftEnabled ? recordKey : null);
  const savedDraft = isDraftEnabled && recordKey !== null ? (drafts[recordKey] ?? null) : null;
  const savedDraftRef = useRef(savedDraft);
  savedDraftRef.current = savedDraft;

  /**
   * Какую версию показывает карточка. Выбирается при открытии записи: есть
   * черновик или запись новая — «Черновик», иначе «Опубликовано». Дальше её
   * переключает только пользователь: черновик, сохранённый из карточки,
   * версию под ним не меняет.
   */
  const [mode, setMode] = useState<CardMode>('published');
  useEffect(() => {
    if (record === null) return;
    // Форма собирается заново вместе с версией: черновик записи, открытой
    // по ссылке, приходит позже самой карточки, и форма успела бы собраться
    // из опубликованного
    showVersion(isDraftEnabled && (isNew(record) || savedDraftRef.current !== null) ? 'draft' : 'published');
    // Только при открытии записи и когда пришёл её черновик
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record?.id, isDraftKnown, isDraftEnabled]);
  const isDraftMode = isDraftEnabled && mode === 'draft';

  /** Запись и значения свойств в версии: в «Черновике» — с черновиком поверх. */
  const versionOf = (isDraftShown: boolean) => ({
    shown: record !== null && isDraftShown ? draftedRow(record, savedDraft, { isParentShown: true }) : record,
    shownValues:
      isDraftShown && savedDraft !== null && record !== null
        ? fieldValuesOf(draftedValues(entry.values[record.id] ?? {}, savedDraft))
        : savedValues,
  });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const shownRecord = useMemo(() => versionOf(isDraftMode).shown, [record, savedDraft, isDraftMode]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const shownValues = useMemo(() => versionOf(isDraftMode).shownValues, [entry.values, isDraftMode, record, savedDraft, savedValues]);

  /** Поля, которые черновик меняет: отметка у поля и у вкладки. */
  const markedKeys = useMemo(() => draftedKeys(savedDraft), [savedDraft]);
  const markNote = isDraftMode ? 'Изменено в черновике' : 'В черновике другое значение';

  // Черновик набирается при открытии записи, а при смене набора полей
  // достраивается: появившееся берём из записи, набранное не теряем. Иначе
  // поле, которого в момент открытия ещё не было, ушло бы на сервер пустым —
  // и запись верхнего уровня потеряла бы родителя
  useEffect(() => {
    setDraft((prev) => grown(prev, shownRecord, cardRef.current));
  }, [shownRecord, cardKeys]);

  // Значений записи ещё нет (открыта не со страницы таблицы) — полей свойств
  // не показываем, пока не придут: черновик из пустоты стёр бы их сохранением
  const isValuesKnown = useRecordValues(
    listKey,
    record === null || isNew(record) ? null : record.id,
  );

  useEffect(() => {
    setValues((prev) =>
      isValuesKnown && isDraftKnown
        ? grown(prev, record === null ? null : shownValues, propertyRef.current)
        : null,
    );
  }, [isValuesKnown, isDraftKnown, record, shownValues, propertyKeys]);

  // Пока шторка уезжает, заголовок держим от последней записи: иначе
  // на время анимации в нём мелькает чужое
  const lastTitle = useRef('');
  if (record !== null && draft !== null) {
    lastTitle.current = isNew(record)
      ? 'Новая запись'
      : `Запись «${String(draft.name ?? '').trim() || record.id}»`;
  }

  // Строки, а не сырые записи: ключи у редактора строковые, иначе выбор
  // родителя не узнаёт в номере записи свой вариант. У дерева — весь список
  const rows = useCardRows(listKey, api, {
    isTree: rules.isTree,
    // Новая запись — пустой ключ: открытие карточки, как и любой другой
    recordId: record === null ? null : record.id,
  });

  const isChanged =
    shownRecord !== null &&
    (JSON.stringify(draft) !== JSON.stringify(draftOf(shownRecord, cardOf)) ||
      (values !== null && JSON.stringify(values) !== JSON.stringify(draftOf(shownValues, propertyFields))));

  const error =
    draft === null
      ? null
      : draftError(draft, cardOf, {
          rows,
          id: record === null || isNew(record) ? null : record.id,
          isCodeUnique: rules.codeUnique,
        });

  /**
   * Закрыть с несохранёнными правками спрашиваем: набранное пропадёт.
   * Пока запрос в полёте, не закрываем вовсе: на сервер ушло то, что было
   * в черновике на момент клика, и обещать «правки пропадут» уже нечестно.
   */
  const close = () => {
    if (isSaving) return;
    if (!isChanged) {
      onClose();
      return;
    }
    modal.confirm({
      title: 'Закрыть без сохранения?',
      content: 'Правки записи пропадут.',
      okText: 'Закрыть',
      cancelText: 'Продолжить правку',
      onOk: onClose,
    });
  };

  const submit = async () => {
    if (draft === null || record === null || error !== null) return;

    const { isSaved, key } = await save(isNew(record) ? null : record.id, payloadOf(draft, cardOf));
    if (!isSaved) return;

    // Значения свойств — вторым запросом, уже под ключом сохранённой записи,
    // и только те, которые правили: остальные сервер не тронет
    const changed = values === null ? {} : changedValues(values, savedValues, propertyFields);
    if (key !== null && Object.keys(changed).length > 0) {
      const isDone = await saveValues(key, propertyValuesOf(changed));
      if (!isDone) return;
    }
    onClose();
  };

  /**
   * Что сейчас в карточке отличается от опубликованного: поля записи — как их
   * принимает раздел, свойства — по номерам. Это и есть черновик.
   */
  const diffOf = (current: RecordDraft, currentValues: RecordDraft | null, published: EditorRow) => ({
    fields: changedValues(current, published, cardOf),
    values: currentValues === null ? {} : propertyValuesOf(changedValues(currentValues, savedValues, propertyFields)),
  });

  /**
   * «Сохранить черновик». Новая запись сначала заводится как обычно — без этого
   * у неё нет номера, — и сразу помечается черновиком: на сайте её нет до
   * публикации. У сохранённой уходит то, что отличается от опубликованного.
   */
  const submitDraft = async () => {
    if (draft === null || record === null || error !== null) return;

    if (isNew(record)) {
      const { isSaved, key } = await save(null, payloadOf(draft, cardOf), { isQuiet: true });
      if (!isSaved || key === null) return;
      const changed = values === null ? {} : changedValues(values, savedValues, propertyFields);
      if (Object.keys(changed).length > 0 && !(await saveValues(key, propertyValuesOf(changed)))) return;
      if (await saveDraft(key, { fields: {}, values: [], isNew: true })) onClose();
      return;
    }

    const diff = diffOf(draft, values, record);
    if (await saveDraft(record.id, { fields: diff.fields, values: draftValueItems(diff.values) })) onClose();
  };

  /**
   * «Опубликовать черновик» — сохранённый, ровно как из таблицы: публикуют то,
   * что видели и сохранили. С несохранёнными правками кнопка закрыта — сначала
   * сохранить или отменить.
   */
  const publishShown = async () => {
    if (record === null || isNew(record) || savedDraft === null || isChanged) return;
    if (await publishDrafts([record])) onClose();
  };

  /** «Отменить» — поля возвращаются к показанной версии: черновику или опубликованному. */
  const revert = () => showVersion(mode);

  /** «Удалить черновик» — карточка возвращается к опубликованному. */
  const discardShown = async () => {
    if (record === null || isNew(record)) return;
    if (!(await discardDraft(record.id))) return;
    showVersion('published');
  };

  /**
   * Собрать форму из версии заново. Ждать, пока её соберут эффекты, нельзя:
   * у записи без черновика обе версии — одна и та же запись, и эффект не сработает.
   */
  const showVersion = (next: CardMode) => {
    const { shown, shownValues: nextValues } = versionOf(isDraftEnabled && next === 'draft');
    setDraft(shown === null ? null : draftOf(shown, cardOf));
    setValues(shown !== null && isValuesKnown && isDraftKnown ? draftOf(nextValues, propertyFields) : null);
    setMode(next);
  };

  /**
   * Сменить версию. С несохранёнными правками не даём: непонятно, к какой
   * версии их отнести. Форма собирается заново из выбранной.
   */
  const switchMode = (next: CardMode) => {
    if (next === mode) return;
    if (isChanged) {
      message.warning('Сохраните или отмените правки перед переключением');
      return;
    }
    showVersion(next);
  };

  const drop = async () => {
    if (record === null || isNew(record)) return;
    if (await remove(record)) onClose();
  };

  const ownFields =
    draft === null ? null : (
      <RecordFields
        fields={cardOf}
        draft={draft}
        isLocked={isSaving || !isEditable}
        isNew={record !== null && isNew(record)}
        markedKeys={markedKeys}
        markNote={markNote}
        parents={parentOptions(
          rows,
          record !== null && !isNew(record) ? record.id : null,
          rules.maxDepth,
        )}
        onChange={(patch) => setDraft((prev) => (prev ? { ...prev, ...patch } : prev))}
      />
    );

  // Даты — внизу вкладки «Запись», у сохранённой записи
  const dates = record !== null && !isNew(record) ? <RecordDates record={record} /> : null;

  const propertyFieldsOf = (tab: EditorFields) =>
    values === null ? null : (
      <RecordFields
        fields={tab}
        draft={values}
        isLocked={isSaving || !isEditable}
        markedKeys={markedKeys}
        markNote={markNote}
        onChange={(patch) => setValues((prev) => (prev ? { ...prev, ...patch } : prev))}
      />
    );

  return (
    <Drawer
      open={record !== null}
      onClose={close}
      // 70% ширины экрана: слева остаётся видна таблица раздела
      size="70%"
      // Пока запись пишется, шторка заперта: правки после клика в тело запроса
      // уже не попадут, а закрытие развело бы показанное с сохранённым
      maskClosable={!isChanged && !isSaving}
      closable={!isSaving}
      keyboard={!isSaving}
      title={
        <div className="flex items-center justify-between gap-4">
          <span>
            {lastTitle.current}
            {/* Запись только в черновике — видно сразу, в какой бы версии её ни открыли */}
            {savedDraft?.isNew === true && <DraftTag draft={savedDraft} />}
          </span>
          <Space>
            {isDraftEnabled && record !== null && (
              <Segmented
                value={mode}
                onChange={(next) => switchMode(next as CardMode)}
                options={[
                  {
                    value: 'draft',
                    label: (
                      <span>
                        Черновик
                        {savedDraft !== null && <Badge status="warning" style={{ marginInlineStart: 6 }} />}
                      </span>
                    ),
                  },
                  // Записи «только в черновике» публиковать нечего — версии на сайте нет
                  { value: 'published', label: 'Опубликовано', disabled: savedDraft?.isNew === true },
                ]}
              />
            )}
            {/* Защищённую запись сервер удалить не даст — и кнопки у неё нет */}
            {record !== null && !isNew(record) && api.remove && record.isBlocked !== true && (
              <Button danger icon={<DeleteOutlined />} disabled={isSaving} onClick={drop}>
                Удалить
              </Button>
            )}
            {/* Отменить — вернуть поля к показанной версии, не закрывая карточку */}
            {isEditable && isChanged && (
              <Button disabled={isSaving} onClick={revert}>
                Отменить
              </Button>
            )}
            {isEditable && (
              <Button
                type="primary"
                loading={isSaving}
                disabled={!isChanged || error !== null}
                onClick={isDraftMode ? submitDraft : submit}
              >
                {isDraftMode ? 'Сохранить черновик' : isDraftEnabled ? 'Опубликовать' : 'Сохранить'}
              </Button>
            )}
          </Space>
        </div>
      }
    >
      {draft !== null && (
        <>
          {/* Чего не хватает, говорим один раз и только тому, кто уже правит */}
          {isChanged && error !== null && (
            <Alert type="warning" message={error} showIcon style={{ marginBottom: 16 }} />
          )}

          {isDraftMode && record !== null && (
            <DraftBlock
              draft={savedDraft}
              isNewRecord={isNew(record)}
              changedCount={markedKeys.size}
              publishBlock={
                savedDraft === null
                  ? 'Сначала сохраните черновик'
                  : isChanged
                    ? 'Сохраните или отмените правки, потом публикуйте'
                    : null
              }
              isBusy={isSaving}
              onPublish={publishShown}
              onDiscard={discardShown}
            />
          )}
          {/* «Опубликовано» при черновике: сохранение уходит сразу на сайт, черновик не трогает */}
          {isDraftEnabled && !isDraftMode && savedDraft !== null && (
            <Alert
              type="info"
              showIcon
              title={`Правки отсюда сразу уходят на сайт. Черновик от ${formatDateTime(savedDraft.updatedAt)} при этом не меняется.`}
              style={{ marginBottom: 16 }}
            />
          )}

          {hasProperties || isHistoryTab ? (
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              // Очистка — в строке вкладок, справа, и только на самой «Истории»
              tabBarExtraContent={
                isHistoryTab && record !== null && activeTab === HISTORY_TAB ? (
                  <ClearHistoryButton
                    listKey={listKey}
                    recordId={record.id}
                    onCleared={() => setHistoryVersion((version) => version + 1)}
                  />
                ) : null
              }
              items={[
                // Первая вкладка «Запись» есть всегда: поля раздела стоят на ней,
                // свойства — на своих
                ...tabs.map((tab) => ({
                  key: tab.key,
                  // Вкладка, где черновик что-то меняет, — с отметкой: правки
                  // бывают не только на «Записи», но и на «Мете»
                  label: isTabMarked(tab, markedKeys) ? (
                    <span>
                      {tab.name}
                      <Badge status="warning" style={{ marginInlineStart: 6 }} />
                    </span>
                  ) : (
                    tab.name
                  ),
                  children: (
                    <Form {...FORM_LAYOUT}>
                      {tab.key === MAIN_TAB && ownFields}
                      {propertyFieldsOf(tab.fields)}
                      {tab.key === MAIN_TAB && dates}
                    </Form>
                  ),
                })),
                ...(isHistoryTab && record !== null
                  ? [
                      {
                        key: HISTORY_TAB,
                        label: 'История',
                        // Собирается заново при каждом показе: запись могли
                        // только что сохранить, и журнал должен быть свежим
                        destroyOnHidden: true,
                        children: (
                          <RecordHistory
                            key={historyVersion}
                            listKey={listKey}
                            recordId={record.id}
                            fields={fields}
                          />
                        ),
                      },
                    ]
                  : []),
              ]}
            />
          ) : (
            <Form {...FORM_LAYOUT}>
              {ownFields}
              {dates}
            </Form>
          )}
        </>
      )}
    </Drawer>
  );
}

/** Версия записи в карточке: черновик или опубликованное. */
type CardMode = 'draft' | 'published';

/**
 * Черновик меняет поле этой вкладки. Поля записи стоят на первой вкладке,
 * и всё, что не свойство, отмечает её.
 */
const isTabMarked = (tab: { key: string; fields: EditorFields }, keys: Set<string>): boolean =>
  Array.from(keys).some((key) => key in tab.fields || (tab.key === MAIN_TAB && !key.startsWith('property-')));

/** Ключ вкладки истории: не пересекается с ключами вкладок из настроек. */
const HISTORY_TAB = '__history';

/** Новая запись: ключа у неё ещё нет — он появится после сохранения. */
const isNew = (record: EditorRow): boolean => record.id === '';

/**
 * Черновик при смене набора полей: появившееся берём из записи, набранное
 * оставляем. Порядок ключей — как в полях карточки: по нему сравнивается,
 * менялось ли что-то.
 */
const grown = (
  prev: RecordDraft | null,
  record: Record<string, unknown> | null,
  fields: EditorFields,
): RecordDraft | null => {
  if (record === null) return null;
  const fresh = draftOf(record, fields);
  if (prev === null) return fresh;
  return Object.fromEntries(
    Object.entries(fresh).map(([key, value]) => [key, key in prev ? prev[key] : value]),
  );
};
