import { useEffect, useMemo, useState } from 'react';
import {
  App,
  Button,
  Checkbox,
  Drawer,
  Form,
  InputNumber,
  Select,
  Space,
  Spin,
  Switch,
  Tabs,
  Typography,
} from 'antd';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../../redux';
import { saveEditorSettingsThunk } from '../../../redux/action-creaters/contentEditorNew';
import {
  emptyNewEditorList,
  type EditorListSettings,
} from '../../../redux/reducers/contentEditorNewReducer';
import {
  CODE_MODE_OPTIONS,
  codeModeFlags,
  codeModeOf,
  isTreeDepth,
  type CodeModeValue,
} from '../../../logic/listSettings';
import { effectiveSettings, type BlockedSettings } from './blockedSettings';
import { PropertyList } from './properties';
import { FORM_LAYOUT, TabCount } from '../ui';

/**
 * Настройки списка: его устройство и свойства его записей. Имени и кода
 * здесь нет: заголовок списка — пункт меню, а код задаёт панель.
 * В прошлом редакторе это было модальное окно; здесь — шторка, как и карточка
 * записи: настроек много, и в окне они не помещались.
 *
 * Окно держит черновик целиком и сохраняет его; таблицу свойств рисует
 * `PropertyList` — она же знает, как свойство устроено. Сами настройки
 * грузит `useLoadEditor` у корня редактора — здесь они только читаются.
 */

/**
 * Что правит само окно: устройство списка и правила записей.
 * Вкладки и свойства живут своей жизнью — они сохраняются своими запросами,
 * и черновика у них нет.
 */
interface SettingsDraft {
  /** Символьный код записей: три флага сервера одним выбором */
  codeMode: CodeModeValue;
  /** Уровней вложенности: 1 — плоский список, null — дерево без ограничения */
  maxDepth: number | null;
  /** Вести журнал изменений: правки записей пишутся в историю, и она видна в редакторе */
  isHistoryEnabled: boolean;
  /** Сохранять правки записей черновиком и публиковать отдельно */
  isDraftEnabled: boolean;
}

const draftOf = (settings: EditorListSettings): SettingsDraft => ({
  codeMode: codeModeOf(settings),
  maxDepth: settings.maxDepth,
  isHistoryEnabled: settings.isHistoryEnabled,
  isDraftEnabled: settings.isDraftEnabled,
});

export default function ContentEditorSettings({
  listKey,
  blockedSettings,
  open,
  onClose,
}: {
  /** Код списка, настройки которого правим */
  listKey: string;
  /** Настройки, закрытые разделом: показываем их значение, править не даём */
  blockedSettings?: BlockedSettings;
  open: boolean;
  onClose: () => void;
}) {
  const dispatch = useDispatch<AppDispatch>();
  const { message, modal } = App.useApp();
  const entry =
    useSelector((state: RootState) => state.contentEditorNew[listKey]) ?? emptyNewEditorList;

  // Закрытые разделом настройки раскладываем по значениям: раздел задаёт их
  // литералом, и у объекта каждый раз новая ссылка — в зависимостях эффекта
  // она гоняла бы черновик по кругу
  const {
    maxDepth: blockedDepth,
    codeMode: blockedCodeMode,
    isHistoryEnabled: blockedHistory,
    isDraftEnabled: blockedDrafts,
  } = blockedSettings ?? {};

  const blocked = useMemo<BlockedSettings>(
    () => ({
      maxDepth: blockedDepth,
      codeMode: blockedCodeMode,
      isHistoryEnabled: blockedHistory,
      isDraftEnabled: blockedDrafts,
    }),
    [blockedDepth, blockedCodeMode, blockedHistory, blockedDrafts],
  );

  // Закрытая настройка сильнее сохранённой: окно и показывает её, и отправляет —
  // иначе список с чужим значением в базе так бы с ним и жил
  const settings = useMemo(
    () => effectiveSettings(entry.settings, blocked),
    [entry.settings, blocked],
  );

  /** Настройку задал раздел — в окне она только читается. */
  const isBlocked = (key: keyof BlockedSettings) => blocked[key] !== undefined;
  const blockedNote = 'Задано разделом и не меняется';

  /**
   * Раздел окна: сам список или свойства его записей. У них разное сохранение —
   * список ждёт «Сохранить», свойства уходят сразу, — поэтому и вкладки разные.
   * Окно всегда открывается на списке.
   */
  const [section, setSection] = useState<'list' | 'properties'>('list');
  useEffect(() => {
    if (open) setSection('list');
  }, [open]);

  const [draft, setDraft] = useState<SettingsDraft | null>(null);

  // Черновик набирается при открытии и после сохранения: несохранённые правки
  // не остаются до следующего раза. При закрытии его не трогаем — иначе пока
  // шторка уезжает, вместо настроек мелькает загрузка
  useEffect(() => {
    if (!open || !settings) return;
    setDraft(draftOf(settings));
  }, [open, settings]);

  const isChanged = useMemo(() => {
    if (!draft || !settings) return false;
    const saved = draftOf(settings);
    return (
      draft.codeMode !== saved.codeMode ||
      draft.maxDepth !== saved.maxDepth ||
      draft.isHistoryEnabled !== saved.isHistoryEnabled ||
      draft.isDraftEnabled !== saved.isDraftEnabled
    );
  }, [draft, settings]);

  const change = (patch: Partial<SettingsDraft>) =>
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));

  const close = () => {
    if (!isChanged) {
      onClose();
      return;
    }
    modal.confirm({
      title: 'Закрыть без сохранения?',
      content: 'Изменения в настройках списка пропадут.',
      okText: 'Закрыть',
      cancelText: 'Продолжить правку',
      onOk: onClose,
    });
  };

  const save = async () => {
    if (!draft || !settings) return;

    const error = await dispatch(
      saveEditorSettingsThunk(listKey, {
        maxDepth: draft.maxDepth,
        isHistoryEnabled: draft.isHistoryEnabled,
        isDraftEnabled: draft.isDraftEnabled,
        // Выбор символьного кода сервер ждёт тремя флагами
        ...codeModeFlags(draft.codeMode),
      }),
    );

    if (error) {
      message.error(error);
      return;
    }
    message.success('Настройки списка сохранены');
    onClose();
  };

  return (
    <Drawer
      open={open}
      onClose={close}
      // 70% ширины экрана: слева остаётся видна таблица раздела
      size="70%"
      maskClosable={!isChanged}
      title={
        <div className="flex items-center justify-between gap-4">
          <span>Настройки списка</span>
          <Space>
            <Button onClick={close}>Отмена</Button>
            <Button
              type="primary"
              loading={entry.isSettingsSaving}
              disabled={!isChanged}
              onClick={save}
            >
              Сохранить
            </Button>
          </Space>
        </div>
      }
    >
      {draft === null ? (
        <Spin />
      ) : (
        <Tabs
          activeKey={section}
          onChange={(key) => setSection(key as 'list' | 'properties')}
          items={[
            {
              key: 'list',
              label: 'Список',
              children: (
                <Form {...FORM_LAYOUT}>
                  {/* Галочка — та же настройка, что и уровни: на сервере одно поле
                `maxDepth`, и 1 в нём значит «плоский список». Включили — два
                уровня, выключили — снова 1 */}
                  <Form.Item
                    label="Древовидная структура"
                    extra={
                      isBlocked('maxDepth')
                        ? blockedNote
                        : 'Записи вкладываются друг в друга, как страницы'
                    }
                  >
                    <Checkbox
                      checked={isTreeDepth(draft.maxDepth)}
                      disabled={isBlocked('maxDepth')}
                      onChange={(event) => change({ maxDepth: event.target.checked ? 2 : 1 })}
                    />
                  </Form.Item>
                  {isTreeDepth(draft.maxDepth) && (
                    <Form.Item
                      label="Уровней вложенности"
                      // У закрытой разделом глубины пояснение уже стоит под галочкой
                      extra={
                        isBlocked('maxDepth')
                          ? undefined
                          : 'От 2; пусто — без ограничения. Предел проверяется, когда запись заводят или переносят'
                      }
                    >
                      <InputNumber
                        value={draft.maxDepth}
                        min={2}
                        max={20}
                        precision={0}
                        disabled={isBlocked('maxDepth')}
                        placeholder="Без ограничения"
                        style={{ width: 200 }}
                        onChange={(maxDepth) =>
                          change({
                            maxDepth: typeof maxDepth === 'number' ? maxDepth : null,
                          })
                        }
                      />
                    </Form.Item>
                  )}
                  <Form.Item
                    label="Символьный код записей"
                    extra={
                      isBlocked('codeMode')
                        ? blockedNote
                        : 'Поле «Код» в карточке записи: по нему запись находит сайт'
                    }
                  >
                    <Select
                      value={draft.codeMode}
                      disabled={isBlocked('codeMode')}
                      options={CODE_MODE_OPTIONS}
                      // В закрытом поле — одно название, пояснение к варианту видно
                      // только в раскрытом списке: иначе поле становится в две строки
                      optionRender={(option) => (
                        <div>
                          <div>{option.data.label}</div>
                          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                            {option.data.description}
                          </Typography.Text>
                        </div>
                      )}
                      onChange={(codeMode) => change({ codeMode })}
                    />
                  </Form.Item>
                  {/* Журнала нет у списков, чьи правки сервер не пишет (файлы, домены):
                раздел закрывает у них переключатель, как и остальное своё */}
                  <Form.Item
                    label="История изменений"
                    extra={
                      isBlocked('isHistoryEnabled')
                        ? blockedNote
                        : 'Кто, когда и что поменял — над таблицей и вкладкой «История» в карточке записи. Выключили — записанное раньше остаётся'
                    }
                  >
                    <Switch
                      checked={draft.isHistoryEnabled}
                      disabled={isBlocked('isHistoryEnabled')}
                      onChange={(isHistoryEnabled) => change({ isHistoryEnabled })}
                    />
                  </Form.Item>
                  {/* Где черновиков не бывает (пользователи, роли, файлы), переключатель
                      закрывает раздел — как журнал у файлов */}
                  <Form.Item
                    label="Черновики"
                    extra={
                      isBlocked('isDraftEnabled')
                        ? blockedNote
                        : 'Правки записей сначала сохраняются черновиком и попадают на сайт по «Опубликовать». Выключить нельзя, пока в списке есть черновики'
                    }
                  >
                    <Switch
                      checked={draft.isDraftEnabled}
                      disabled={isBlocked('isDraftEnabled')}
                      onChange={(isDraftEnabled) => change({ isDraftEnabled })}
                    />
                  </Form.Item>
                </Form>
              ),
            },
            {
              key: 'properties',
              label: (
                <span className="inline-flex items-center gap-1.5">
                  Свойства записей
                  <TabCount count={entry.properties.length} isActive={section === 'properties'} />
                </span>
              ),
              children: <PropertyList listKey={listKey} />,
            },
          ]}
        />
      )}
    </Drawer>
  );
}
