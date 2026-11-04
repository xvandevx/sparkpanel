import { useMemo, useState } from 'react';
import { Button, Drawer, Input, Table, Tree, Typography } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import {
  formatFileDate,
  formatFileSize,
  pickError,
  pickerFiles,
  sectionTree,
  startSection,
  treeKeys,
  useFileSections,
  useFiles,
  type FileDto,
  type FileRules,
} from '../../../../logic/files';
import { FileThumb } from '../../ui';

/** Что выбирают: настройки поля, из которого открыли выбор. */
interface PickerOptions {
  /** Свойство поля: выбор открывается на его разделе */
  propertyId: number | null;
  /** Ограничения поля: у изображения в выборе только картинки, неподходящие по формату и весу закрыты */
  rules: FileRules | null;
  isMultiple: boolean;
  /** Уже выбранные в поле — второй раз их не предлагаем */
  chosen: number[];
}

/**
 * Выбор файла из загруженных — шторка поверх карточки записи: слева разделы
 * «Файлов» деревом, справа файлы раздела с превью (картинка увеличивается
 * по клику). Открывается на разделе своего свойства: туда ложится всё,
 * что загрузили через него.
 *
 * Одиночное поле выбирает один файл, множественное — сколько угодно. Шторка
 * только отдаёт выбранные номера, в значение их кладёт само поле.
 */
export default function FilePickerDrawer({
  open,
  options,
  onPick,
  onClose,
}: {
  open: boolean;
  options: PickerOptions;
  onPick: (ids: number[]) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<number[]>([]);

  // Прошлый выбор уже лёг в поле или от него отказались: следующее открытие — с чистого
  const close = () => {
    setSelected([]);
    onClose();
  };
  const pick = () => {
    onPick(selected);
    close();
  };

  return (
    <Drawer
      open={open}
      onClose={close}
      // Уже карточки: из-под шторки видно, какое поле заполняют
      size="60%"
      // Содержимое собирается при каждом открытии: разделы и файлы перечитываются,
      // поиск и раздел — с начала
      destroyOnHidden
      title={
        <div className="flex items-center justify-between gap-4">
          <span>{options.isMultiple ? 'Выбор файлов' : 'Выбор файла'}</span>
          <Button type="primary" disabled={selected.length === 0} onClick={pick}>
            {selected.length > 1 ? `Выбрать (${selected.length})` : 'Выбрать'}
          </Button>
        </div>
      }
    >
      <PickerBody options={options} selected={selected} onSelect={setSelected} />
    </Drawer>
  );
}

/** Дерево разделов, поиск и файлы с превью. */
function PickerBody({
  options,
  selected,
  onSelect,
}: {
  options: PickerOptions;
  selected: number[];
  onSelect: (ids: number[]) => void;
}) {
  const { propertyId, rules, isMultiple, chosen } = options;
  const isImageOnly = rules?.isImageOnly === true;
  const { sections } = useFileSections();
  const { files, isLoading } = useFiles();

  const tree = useMemo(() => sectionTree(sections), [sections]);
  // Пока раздел не выбрали руками — раздел свойства: разделы могут прийти
  // уже после открытия, и выбор должен его подхватить
  const [picked, setPicked] = useState<string | null>(null);
  const section = picked ?? startSection(sections, propertyId);
  const [query, setQuery] = useState('');

  const rows = useMemo(
    () => pickerFiles(files, { section, query, chosen, isImageOnly }),
    [chosen, files, isImageOnly, query, section],
  );

  /** Почему файл не выбрать; null — подходит. */
  const errorOf = (file: FileDto) => (rules ? pickError(file, rules) : null);

  /** Клик по строке: у одиночного поля — этот файл, у множественного — добавить или убрать. */
  const toggle = (id: number) =>
    onSelect(
      !isMultiple
        ? [id]
        : selected.includes(id)
          ? selected.filter((item) => item !== id)
          : [...selected, id],
    );

  return (
    <div className="flex gap-6">
      <div style={{ width: 260, flex: 'none' }}>
        <Tree
          blockNode
          treeData={tree}
          // Дерево раскрыто целиком: разделов немного, а искать по веткам долго
          expandedKeys={treeKeys(tree)}
          selectedKeys={[section]}
          onSelect={(keys) => {
            if (keys.length > 0) setPicked(String(keys[0]));
          }}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <Input
          allowClear
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          prefix={<SearchOutlined />}
          placeholder="Поиск: имя, описание"
          style={{ maxWidth: 360 }}
        />

        <Table
          rowKey="id"
          size="middle"
          loading={isLoading}
          dataSource={rows}
          pagination={false}
          locale={{ emptyText: 'Подходящих файлов в разделе нет' }}
          rowSelection={{
            type: isMultiple ? 'checkbox' : 'radio',
            selectedRowKeys: selected,
            onChange: (keys) => onSelect(keys.map(Number)),
            getCheckboxProps: (file: FileDto) => ({ disabled: errorOf(file) !== null }),
          }}
          // Неподходящий файл виден, но не выбирается: спрятанный не объяснил бы,
          // куда делся, а выбранный сервер отверг бы только на «Сохранить»
          onRow={(file) =>
            errorOf(file) === null
              ? { onClick: () => toggle(file.id), style: { cursor: 'pointer' } }
              : {}
          }
          columns={[
            {
              key: 'preview',
              width: 72,
              render: (_: unknown, file: FileDto) => (
                <FileThumb url={file.url} isImage={file.isImage} size={48} />
              ),
            },
            {
              key: 'name',
              title: 'Файл',
              render: (_: unknown, file: FileDto) => (
                <div className="flex min-w-0 flex-col">
                  <span>{file.name}</span>
                  {errorOf(file) && (
                    <Typography.Text type="danger" style={{ fontSize: 12 }}>
                      {errorOf(file)}
                    </Typography.Text>
                  )}
                </div>
              ),
            },
            {
              key: 'size',
              title: 'Размер',
              width: 100,
              render: (_: unknown, file: FileDto) => formatFileSize(file.size),
            },
            {
              key: 'createdAt',
              title: 'Загружен',
              width: 150,
              render: (_: unknown, file: FileDto) => formatFileDate(file.createdAt),
            },
          ]}
        />
      </div>
    </div>
  );
}
