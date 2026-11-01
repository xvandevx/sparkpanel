import { useEffect, useState } from 'react';
import { Alert, App, Button, Checkbox, Drawer, InputNumber, Space, Spin, Table, Typography } from 'antd';
import { ArrowDownOutlined, ArrowUpOutlined } from '@ant-design/icons';
import { PROPERTY_TYPE_LABELS, type PropertyType } from '../../../../logic/listSettings';
import { ActionIcon } from '../../ui';
import type { EditorColumns } from '../ContentEditorTable';
import { columnsDraft, mainColumnKey, moveColumn, viewOf, type ColumnDraft } from './columnView';
import { useColumns } from './useColumns';

/**
 * Шторка «Колонки таблицы»: какие колонки видны, в каком порядке и какой
 * ширины. Строки — колонки раздела и свойства записей; галочка показывает
 * колонку, стрелки двигают её. Вид у каждого пользователя свой.
 *
 * «По умолчанию» стирает сохранённый вид, а не сохраняет копию колонок
 * раздела: тогда колонки, которые раздел добавит потом, появятся сами.
 */
export default function ColumnSettings({
  listKey,
  columns,
  open,
  onClose,
}: {
  /** Код списка, таблицу которого настраивают */
  listKey: string;
  /** Колонки раздела — они же колонки по умолчанию */
  columns: EditorColumns;
  open: boolean;
  onClose: () => void;
}) {
  const { message, modal } = App.useApp();
  const { available, saved, isCustom, save, reset } = useColumns(listKey, columns);

  const [draft, setDraft] = useState<ColumnDraft[] | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Набор колонок — строкой: описание раздел может отдать литералом, и по
  // ссылке черновик пересобирался бы на каждый рендер, теряя набранное
  const availableKeys = available.map((item) => item.key).join();

  // Черновик набирается при открытии и после записи: несохранённое
  // до следующего раза не доживает
  useEffect(() => {
    if (!open || saved === null) return;
    setDraft(columnsDraft(available, saved));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, saved, availableKeys]);

  const view = draft === null ? [] : viewOf(draft);
  const isChanged =
    draft !== null &&
    saved !== null &&
    JSON.stringify(view) !== JSON.stringify(viewOf(columnsDraft(available, saved)));
  const isEmpty = draft !== null && view.length === 0;
  // Главная колонка тянется на свободное место — ширину ей не задают
  const mainKey = mainColumnKey(
    view.map((item) => item.key),
    columns,
  );

  const change = (key: string, patch: Partial<ColumnDraft>) =>
    setDraft((prev) => prev && prev.map((item) => (item.key === key ? { ...item, ...patch } : item)));

  const move = (index: number, step: -1 | 1) =>
    setDraft((prev) => prev && moveColumn(prev, index, step));

  const close = () => {
    if (!isChanged) {
      onClose();
      return;
    }
    modal.confirm({
      title: 'Закрыть без сохранения?',
      content: 'Изменения в колонках пропадут.',
      okText: 'Закрыть',
      cancelText: 'Продолжить правку',
      onOk: onClose,
    });
  };

  const submit = async () => {
    setIsSaving(true);
    const error = await save(view);
    setIsSaving(false);
    if (error) {
      message.error(error);
      return;
    }
    message.success('Колонки сохранены');
    onClose();
  };

  /**
   * Сохранённого вида нет — стирать на сервере нечего, черновик просто
   * возвращается к колонкам раздела. Есть — стираем, и черновик пересоберётся
   * сам, когда в стор придёт пустой вид.
   */
  const toDefault = () => {
    if (!isCustom) {
      setDraft(columnsDraft(available, []));
      return;
    }
    modal.confirm({
      title: 'Вернуть колонки по умолчанию?',
      content: 'Выбор, порядок и ширина колонок пропадут — таблица покажет колонки раздела.',
      okText: 'Вернуть',
      cancelText: 'Отмена',
      onOk: async () => {
        const error = await reset();
        if (error) message.error(error);
        else message.success('Колонки — по умолчанию');
      },
    });
  };

  return (
    <Drawer
      open={open}
      onClose={close}
      size={640}
      maskClosable={!isChanged}
      title={
        <div className="flex items-center justify-between gap-4">
          <span>Колонки таблицы</span>
          <Space>
            {/* Без своего вида и правок сбрасывать нечего: колонки и так по умолчанию */}
            <Button disabled={!isCustom && !isChanged} onClick={toDefault}>
              По умолчанию
            </Button>
            <Button onClick={close}>Отмена</Button>
            <Button
              type="primary"
              loading={isSaving}
              disabled={!isChanged || isEmpty}
              onClick={submit}
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
        <div className="flex flex-col gap-4">
          <Typography.Text type="secondary">
            Отмеченные колонки видны в таблице — слева направо, в порядке этого списка.
            Пустая ширина — как задал раздел. Первая колонка после ID тянется на всё
            свободное место — ширина ей не задаётся. Колонки настраиваются для вас:
            у других пользователей таблица своя.
          </Typography.Text>

          {isEmpty && <Alert type="warning" showIcon message="Отметьте хотя бы одну колонку" />}

          <Table
            size="small"
            rowKey="key"
            dataSource={draft}
            pagination={false}
            columns={[
              {
                key: 'isShown',
                width: 48,
                render: (_: unknown, item: ColumnDraft) => (
                  <Checkbox
                    checked={item.isShown}
                    aria-label={`Показывать колонку «${item.name}»`}
                    onChange={(event) => change(item.key, { isShown: event.target.checked })}
                  />
                ),
              },
              {
                key: 'name',
                title: 'Колонка',
                render: (_: unknown, item: ColumnDraft) => (
                  <div className="flex flex-col">
                    <span>{item.name}</span>
                    {/* Свойство от поля раздела в списке не отличить — подписываем */}
                    {item.property && (
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        Свойство ·{' '}
                        {PROPERTY_TYPE_LABELS[item.property.type as PropertyType] ??
                          item.property.type}
                      </Typography.Text>
                    )}
                  </div>
                ),
              },
              {
                key: 'width',
                title: 'Ширина, px',
                width: 140,
                render: (_: unknown, item: ColumnDraft) => (
                  <InputNumber
                    value={item.width}
                    min={40}
                    max={2000}
                    precision={0}
                    disabled={!item.isShown || item.key === mainKey}
                    placeholder={
                      item.key === mainKey
                        ? 'всё место'
                        : item.defaultWidth
                          ? String(item.defaultWidth)
                          : 'авто'
                    }
                    style={{ width: '100%' }}
                    onChange={(width) => change(item.key, { width: typeof width === 'number' ? width : null })}
                  />
                ),
              },
              {
                key: 'order',
                width: 72,
                align: 'right' as const,
                render: (_: unknown, _item: ColumnDraft, index: number) => (
                  <Space size={4}>
                    <ActionIcon
                      title="Выше"
                      icon={<ArrowUpOutlined />}
                      isDisabled={index === 0}
                      onClick={() => move(index, -1)}
                    />
                    <ActionIcon
                      title="Ниже"
                      icon={<ArrowDownOutlined />}
                      isDisabled={index === draft.length - 1}
                      onClick={() => move(index, 1)}
                    />
                  </Space>
                ),
              },
            ]}
          />
        </div>
      )}
    </Drawer>
  );
}
