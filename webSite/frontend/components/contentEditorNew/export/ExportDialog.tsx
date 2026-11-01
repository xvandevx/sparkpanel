import { useEffect, useState } from 'react';
import { App, Button, Checkbox, Modal, Space, Typography } from 'antd';
import { PROPERTY_TYPE_LABELS, type PropertyType } from '../../../logic/listSettings';
import type { EditorColumns } from '../table';
import type { TableColumn } from '../table/columns';
import { exportColumnName } from './exportTable';
import { useExport } from './useExport';

/**
 * Окно «Экспорт в CSV»: галочками выбирают, какие поля записей и свойства
 * попадут в файл. Открывается с колонками, видными в таблице, — обычно
 * выгружают то, что и так на экране.
 */
export default function ExportDialog({
  listKey,
  columns,
  open,
  onClose,
}: {
  /** Код списка, который выгружают */
  listKey: string;
  /** Колонки раздела: из них и свойств записей выбирают поля файла */
  columns: EditorColumns;
  open: boolean;
  onClose: () => void;
}) {
  const { message } = App.useApp();
  const [keys, setKeys] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  // Закрытое окно ничего не держит отмеченным — и файлы с привязками не грузятся
  const exporter = useExport(listKey, columns, open ? keys : []);
  const { available, shownKeys } = exporter;

  // Отметки набираются заново при каждом открытии: прошлый выбор — о прошлой выгрузке
  useEffect(() => {
    if (open) setKeys(shownKeys);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const fields = available.filter((item) => !item.property);
  const properties = available.filter((item) => item.property);
  const isAllChecked = keys.length === available.length;

  const toggle = (key: string, isChecked: boolean) =>
    setKeys((prev) => (isChecked ? [...prev, key] : prev.filter((item) => item !== key)));

  const submit = async () => {
    setIsRunning(true);
    try {
      const count = await exporter.run();
      message.success(`Выгружено записей: ${count}`);
      onClose();
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Не удалось выгрузить записи');
    } finally {
      setIsRunning(false);
    }
  };

  const group = (title: string, items: TableColumn[]) =>
    items.length > 0 && (
      <div className="flex flex-col gap-2">
        <Typography.Text strong>{title}</Typography.Text>
        {items.map((item) => (
          <Checkbox
            key={item.key}
            checked={keys.includes(item.key)}
            onChange={(event) => toggle(item.key, event.target.checked)}
          >
            {exportColumnName(item)}
            {item.property && (
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {' '}
                · {PROPERTY_TYPE_LABELS[item.property.type as PropertyType] ?? item.property.type}
              </Typography.Text>
            )}
          </Checkbox>
        ))}
      </div>
    );

  return (
    <Modal
      open={open}
      title="Экспорт в CSV"
      onCancel={onClose}
      footer={
        <Space>
          <Button onClick={onClose}>Отмена</Button>
          <Button
            type="primary"
            loading={isRunning || exporter.isPreparing}
            disabled={keys.length === 0 || !exporter.isReady}
            onClick={submit}
          >
            Выгрузить
          </Button>
        </Space>
      }
    >
      <div className="flex flex-col gap-4">
        <Typography.Text type="secondary">
          {exporter.isFiltered
            ? 'В файл попадут все записи, отобранные поиском и фильтром, — со всех страниц, в порядке таблицы.'
            : 'В файл попадут все записи списка — со всех страниц, в порядке таблицы.'}
        </Typography.Text>

        <Checkbox
          checked={isAllChecked}
          indeterminate={keys.length > 0 && !isAllChecked}
          onChange={(event) => setKeys(event.target.checked ? available.map((item) => item.key) : [])}
        >
          Выбрать все
        </Checkbox>

        {group('Поля записи', fields)}
        {group('Свойства', properties)}
      </div>
    </Modal>
  );
}
