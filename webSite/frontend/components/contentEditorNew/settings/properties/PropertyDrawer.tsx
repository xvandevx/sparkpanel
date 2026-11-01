import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Checkbox,
  ConfigProvider,
  Drawer,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Tooltip,
  Typography,
} from 'antd';
import { DeleteOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { useDispatch } from 'react-redux';
import {
  PropertyType,
  PROPERTY_TYPE_LABELS,
  canChangeType,
  isTextType,
} from '../../../../logic/listSettings';
import { slugify } from '../../../../logic/slug';
import type { AppDispatch } from '../../../../redux';
import {
  loadEditorLinkSourcesThunk,
  loadEditorOptionSourcesThunk,
  type EditorLinkSource,
  type EditorOptionSource,
} from '../../../../redux/action-creaters/contentEditorNew';
import PropertyTypeFields, { hasTypeParams } from './PropertyTypeFields';
import type { PropertyDraft } from './property';
import { useProperties } from './useProperties';
import { CodeInput, FORM_LAYOUT } from '../../ui';

/**
 * Карточка одного свойства: общие поля, порядок в карточке записи и параметры
 * его типа — варианты списка, форматы и вес файла, разрешение изображения,
 * столбцы таблицы, список-источник привязки.
 *
 * Свойство заводят и правят только здесь, здесь же и сохраняют: запись уходит
 * на сервер по своему номеру, и передавать черновик наверх, в таблицу,
 * незачем. Правки копятся в шторке — пока «Сохранить» не нажали, в таблице
 * остаётся то, что лежит в базе.
 */

const TYPE_OPTIONS = Object.entries(PROPERTY_TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

/**
 * Пояснение под типом заведённого свойства: можно ли его сменить и на что.
 * Новому свойству пояснять нечего — тип выбирают впервые.
 */
const typeHint = (isNew: boolean, isFilled: boolean, isTextType: boolean): string | undefined => {
  if (isNew) return undefined;
  if (!isFilled) {
    return 'Свойство ещё нигде не заполнено — тип можно сменить на любой. Когда у записей появятся значения, останется переход только между строкой, текстом и HTML';
  }
  return isTextType
    ? 'Свойство уже заполнено у записей — тип меняется только между строкой, текстом и HTML: значения от этого не пострадают'
    : 'Свойство уже заполнено у записей, и тип у него не меняется: значения хранятся так, как их понимает тип. Нужен другой — заведите новое свойство';
};

/** Код свойства — ключ значения в записи: латиница, цифры и подчёркивание. */
const propertyCode = (name: string): string => slugify(name).replace(/-/g, '_');

/**
 * Зачем свойство скрывают. Секрет нужен серверу (ключ хранилища, пароль
 * интеграции), а показать его — значит отдать любому, кто видит панель
 */
const HIDDEN_NOTE =
  'Значение записывают, но ни карточка записи, ни сайт его не получат — так хранят пароли и ключи ' +
  'доступа, которые нужны только серверу. Поле в карточке после сохранения пустое: ' +
  'новое значение заменит прежнее, пустое оставит как есть';

/**
 * Зачем свойство отдают внешнему источнику. Значение выгружает другая система
 * (учётная, склад), и правка в панели разошлась бы с ней до следующей выгрузки
 */
const EXTERNAL_NOTE =
  'Значение приходит из другой системы — учётной, складской, интеграции — и пишет его она ' +
  '(через MCP). В карточке записи поле видно, но закрыто, а сервер не примет правку из панели: ' +
  'иначе следующая выгрузка молча затёрла бы её';

/** Пояснение под правилами — к тем, что включены и требуют объяснения. */
const rulesNote = (draft: PropertyDraft): string | undefined =>
  [
    draft.isMultiDomain === true
      ? 'Мультидоменное: в записи задают значение для всех доменов и, если нужно, своё для отдельных доменов и поддоменов'
      : null,
    draft.isHidden === true ? 'Не через API: значение пишут, но не читают — ни карточка, ни сайт' : null,
    draft.isExternal === true
      ? 'Внешний источник: значение пишет другая система, в карточке записи поле закрыто'
      : null,
  ]
    .filter(Boolean)
    .join('. ') || undefined;

export default function PropertyDrawer({
  listKey,
  property,
  onClose,
}: {
  /** Код списка, свойство которого правят */
  listKey: string;
  /** Свойство, которое правят; null — шторка закрыта */
  property: PropertyDraft | null;
  onClose: () => void;
}) {
  const dispatch = useDispatch<AppDispatch>();
  const { isSaving, save, remove } = useProperties(listKey);
  const [linkSources, setLinkSources] = useState<EditorLinkSource[]>([]);
  const [optionSources, setOptionSources] = useState<EditorOptionSource[]>([]);
  const [draft, setDraft] = useState<PropertyDraft | null>(null);

  /**
   * Код из названия: у нового свойства — сразу, у заведённого — только если
   * включат. Его код уже читает сайт, и переименование не должно молча его менять.
   */
  const [isCodeAuto, setIsCodeAuto] = useState(false);

  // Черновик набирается при открытии: закрыли, не сохранив, — правок нет
  useEffect(() => {
    setDraft(property);
    setIsCodeAuto(property?.id === null);
  }, [property]);

  // Пока шторка уезжает, заголовок держим от последнего свойства: иначе
  // на время анимации в нём мелькает чужое
  const lastTitle = useRef('');
  if (draft) {
    lastTitle.current =
      draft.id === null
        ? 'Новое свойство'
        : `Свойство «${String(draft.name ?? '').trim() || 'без названия'}»`;
  }

  const isLink = draft?.type === PropertyType.ContentLink;
  const isOptionLink = draft?.type === PropertyType.ListOptionLink;

  /**
   * Тип заведённого свойства меняется, только пока это не портит значения
   * записей: сверяемся с тем, что лежит в базе, а не с черновиком
   */
  const savedType = property?.type as PropertyType;
  const isFilled = property?.isFilled === true;
  const typeOptions = TYPE_OPTIONS.map((option) => ({
    ...option,
    disabled:
      property?.id !== null && !canChangeType(savedType, option.value as PropertyType, isFilled),
  }));
  const isTypeLocked = typeOptions.every(
    (option) => option.disabled || option.value === draft?.type,
  );

  /**
   * Системное свойство заводит сервер (`system-properties.ts` на бэкенде), и ни
   * поменять, ни удалить его нельзя: шторка показывает его на просмотр.
   */
  const isSystem = draft?.isBlocked === true;

  // Списки для привязки грузим, только когда её и настраивают
  useEffect(() => {
    if (!isLink) return;
    dispatch(loadEditorLinkSourcesThunk())
      .then(setLinkSources)
      .catch(() => setLinkSources([]));
  }, [dispatch, isLink]);

  // Свойства-«Списки» — тоже только для привязки к значениям списка
  useEffect(() => {
    if (!isOptionLink) return;
    dispatch(loadEditorOptionSourcesThunk())
      .then(setOptionSources)
      .catch(() => setOptionSources([]));
  }, [dispatch, isOptionLink]);

  const change = (patch: Partial<PropertyDraft>) =>
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));

  const changeCodeAuto = (isAuto: boolean) => {
    setIsCodeAuto(isAuto);
    // Включили — код сразу догоняет название, выключили — остаётся каким был
    if (isAuto) change({ code: propertyCode(String(draft?.name ?? '')) });
  };

  const isChanged = draft !== null && JSON.stringify(draft) !== JSON.stringify(property);
  const isValid =
    draft !== null && String(draft.name).trim() !== '' && String(draft.code).trim() !== '';

  // Удалось — шторке больше нечего показывать: закрываем
  const saveAndClose = async () => {
    if (draft && (await save(draft))) onClose();
  };
  const removeAndClose = async () => {
    if (draft && (await remove(draft))) onClose();
  };

  return (
    <Drawer
      open={draft !== null}
      onClose={onClose}
      // Половина экрана: за шторкой остаётся видна таблица свойств
      size="50%"
      title={
        <div className="flex items-center justify-between gap-4">
          <span>{lastTitle.current}</span>
          <Space>
            {draft?.id !== null && !isSystem && (
              <Button danger icon={<DeleteOutlined />} onClick={removeAndClose}>
                Удалить
              </Button>
            )}
            {!isSystem && (
              <Button
                type="primary"
                loading={isSaving}
                disabled={!isChanged || !isValid}
                onClick={saveAndClose}
              >
                Сохранить
              </Button>
            )}
          </Space>
        </div>
      }
    >
      {draft && (
        // У системного свойства закрыто всё разом, включая параметры типа
        <ConfigProvider componentDisabled={isSystem}>
          <div className="flex flex-col gap-2">
            {isSystem && (
              <Alert
                type="info"
                showIcon
                style={{ marginBottom: 12 }}
                title="Системное свойство"
                description="Его заводит сама панель: на нём держится то, что лежит вне списка. Поменять или удалить свойство нельзя, а значения у записей правятся как обычно."
              />
            )}
            <Form {...FORM_LAYOUT}>
              <Form.Item label="Название" extra="Подпись поля в карточке записи">
                <Input
                  value={draft.name}
                  onChange={(event) => {
                    const name = event.target.value;
                    change(isCodeAuto ? { name, code: propertyCode(name) } : { name });
                  }}
                  placeholder="Например, Цена"
                />
              </Form.Item>

              <Form.Item
                label="Подсказка"
                extra="Пояснение под полем в карточке записи; пусто — без пояснения"
              >
                <Input.TextArea
                  value={String(draft.hint ?? '')}
                  autoSize={{ minRows: 1, maxRows: 4 }}
                  maxLength={500}
                  onChange={(event) => change({ hint: event.target.value })}
                  placeholder="Например, Цена с НДС, в рублях"
                />
              </Form.Item>

              <Form.Item
                label="Код"
                extra={
                  draft.id === null
                    ? 'Ключ значения: по нему свойство читает сайт'
                    : 'Ключ значения: по нему свойство читает сайт. Сменить код можно — значения записей от этого не пострадают, они привязаны к самому свойству'
                }
              >
                <CodeInput
                  value={draft.code}
                  isAuto={isCodeAuto}
                  placeholder="price"
                  onChange={(code) => change({ code })}
                  onAuto={changeCodeAuto}
                />
              </Form.Item>

              <Form.Item
                label="Тип"
                extra={typeHint(draft.id === null, isFilled, isTextType(savedType))}
              >
                <Select
                  value={draft.type}
                  options={typeOptions}
                  // Сменить не на что — закрываем поле целиком, а не каждый вариант.
                  // Свой `disabled` перебивает запрет шторки — системность учитываем здесь же
                  disabled={isSystem || isTypeLocked}
                  onChange={(type) =>
                    change({
                      type,
                      // У таблицы множественности не бывает: строк в ней и так сколько угодно
                      ...(type === PropertyType.Table ? { multiple: false } : {}),
                    })
                  }
                />
              </Form.Item>

              <Form.Item
                label="Сортировка"
                extra="Чем меньше число, тем выше поле в карточке записи"
              >
                <InputNumber
                  value={draft.position}
                  min={0}
                  step={10}
                  style={{ width: 160 }}
                  onChange={(position) =>
                    change({ position: typeof position === 'number' ? position : 0 })
                  }
                />
              </Form.Item>

              {/* Подпись нужна и здесь: без неё галочки встали бы под колонку
                  подписей, а не в один ряд с остальными полями */}
              <Form.Item label="Правила" extra={rulesNote(draft)}>
                <Space size={16} wrap>
                  <Checkbox
                    checked={draft.required === true}
                    onChange={(event) => change({ required: event.target.checked })}
                  >
                    Обязательное
                  </Checkbox>
                  <Checkbox
                    checked={draft.multiple === true}
                    // У таблицы несколько значений не бывает: это уже сама таблица.
                    // Свой `disabled` перебивает запрет шторки — системность учитываем здесь же
                    disabled={isSystem || draft.type === PropertyType.Table}
                    onChange={(event) => change({ multiple: event.target.checked })}
                  >
                    Множественное
                  </Checkbox>
                  <Checkbox
                    checked={draft.isMultiDomain === true}
                    // Выключили — ключа в черновике нет, как у свойства, которое
                    // не включали: иначе шторка сочла бы его изменённым
                    onChange={(event) =>
                      change({ isMultiDomain: event.target.checked || undefined })
                    }
                  >
                    Мультидоменное
                  </Checkbox>
                  <Checkbox
                    checked={draft.isHidden === true}
                    onChange={(event) => change({ isHidden: event.target.checked || undefined })}
                  >
                    <Space size={4}>
                      Не отдавать через API
                      <Tooltip title={HIDDEN_NOTE}>
                        <QuestionCircleOutlined />
                      </Tooltip>
                    </Space>
                  </Checkbox>
                  <Checkbox
                    checked={draft.isExternal === true}
                    onChange={(event) => change({ isExternal: event.target.checked || undefined })}
                  >
                    <Space size={4}>
                      Внешний источник
                      <Tooltip title={EXTERNAL_NOTE}>
                        <QuestionCircleOutlined />
                      </Tooltip>
                    </Space>
                  </Checkbox>
                </Space>
              </Form.Item>
            </Form>

            {/* У строки, числа, текста и HTML настраивать нечего — блока просто нет */}
            {hasTypeParams(draft.type as PropertyType) && (
              <>
                <Typography.Title level={5} style={{ margin: 0 }}>
                  Параметры типа «{PROPERTY_TYPE_LABELS[draft.type as PropertyType]}»
                </Typography.Title>

                <PropertyTypeFields
                  property={draft}
                  linkSources={linkSources}
                  optionSources={optionSources}
                  onChange={change}
                />
              </>
            )}
          </div>
        </ConfigProvider>
      )}
    </Drawer>
  );
}
