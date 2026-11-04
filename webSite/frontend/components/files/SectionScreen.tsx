import { useState } from 'react';
import Link from 'next/link';
import { Alert, App, Breadcrumb, Button, Result, Spin, Upload } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import {
  ContentEditor,
  type EditorColumns,
  type EditorFields,
  type EditorSettings,
} from '../contentEditorNew';
import {
  fileLinks,
  formatFileDate,
  formatFileSize,
  useFileActions,
  useFileSection,
  type FileLinkDto,
} from '../../logic/files';
import { CodeMode } from '../../logic/listSettings';
import { PageTitle } from '../ui';

/**
 * Один раздел файлов: крошки до него, загрузка и список файлов на редакторе
 * контента. Файл — запись списка `files.<номер раздела>`: в карточке правят
 * его имя и описание, корзина в строке удаляет. Заводится файл не карточкой,
 * а загрузкой с диска — поэтому у Api раздела нет `create`, а кнопка загрузки
 * стоит над списком.
 */
const FILE_FIELDS: EditorFields = {
  name: { name: 'Имя файла', isRequired: true, note: 'Так файл называется в панели; адрес файла от имени не зависит' },
};

const FILE_COLUMNS: EditorColumns = {
  url: { name: '', size: 72, isPreview: true },
  // Имя открывает сам файл в новой вкладке — как в поле файла у карточки записи
  name: { name: 'Файл', size: 200, isSort: true, isSearch: true, linkField: 'url' },
  links: {
    name: 'Привязан к',
    logic: (row) => fileLinks((row.links as FileLinkDto[] | undefined) ?? []),
  },
  // Куда файл загружен: хранилище для новых файлов меняют, а загруженные остаются, где были
  storageName: { name: 'Хранилище', size: 160, isSort: true, isSearch: true, isTag: true },
  size: { name: 'Размер', size: 100, logic: (row) => formatFileSize(Number(row.size)) },
  createdAt: { name: 'Загружен', size: 160, logic: (row) => formatFileDate(String(row.createdAt)) },
};

/**
 * Журнала у файлов нет; добавляют их кнопкой «Загрузить файлы», а не карточкой.
 * Заголовок списка не нужен: раздел назван сам, рядом с загрузкой.
 */
const FILE_VIEW: EditorSettings = {
  isTitleHidden: true,
  isHistoryHidden: true,
  isListSettingsHidden: true,
  isExportHidden: true,
};

export default function SectionScreen() {
  const { message } = App.useApp();
  const { section, path, target, listKey, filesApi, refreshFiles, isLoaded, error } = useFileSection();
  const { upload } = useFileActions();
  const [isUploading, setIsUploading] = useState(false);

  /** Файлы по одному, по порядку: так ошибка одного не теряется среди остальных. */
  const uploadAll = async (list: File[]) => {
    if (target === null) return;
    setIsUploading(true);
    let count = 0;
    for (const file of list) {
      const { error: failure } = await upload(file, target);
      if (failure) message.error(failure);
      else count += 1;
    }
    setIsUploading(false);
    if (count > 0) {
      refreshFiles();
      message.success(count === 1 ? 'Файл загружен' : `Загружено файлов: ${count}`);
    }
  };

  if (error && !isLoaded) return <Alert type="error" showIcon message={error} />;
  if (!isLoaded) return <Spin />;
  if (!section || listKey === null || filesApi === null) {
    return (
      <Result
        status="404"
        title="Раздел не найден"
        extra={<Link href="/admin/files">К разделам файлов</Link>}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumb
        items={[
          { title: <Link href="/admin/files">Файлы</Link> },
          ...path.map((item) => ({
            // В группу разделов свойств не заходят — она только подпись в пути
            title:
              item.id === section.id || item.isGroup ? (
                item.name
              ) : (
                <Link href={`/admin/files/${item.id}`}>{item.name}</Link>
              ),
          })),
        ]}
      />
      {/* Раздел файлов назван своим именем — как и любой раздел панели */}
      <div className="flex items-center justify-between gap-4">
        <PageTitle>{section.name}</PageTitle>
        <Upload
          multiple
          showUploadList={false}
          disabled={isUploading}
          // antd зовёт это на каждый файл, но отдаёт и весь выбор: берём его
          // целиком на первом. Штатную загрузку antd отключаем — ведёт её стор
          beforeUpload={(file, list) => {
            if (file === list[0]) uploadAll(list);
            return false;
          }}
        >
          <Button type="primary" icon={<UploadOutlined />} loading={isUploading}>
            Загрузить файлы
          </Button>
        </Upload>
      </div>

      {section.propertyId !== null && (
        <Alert
          type="info"
          showIcon
          message="Файлы, загруженные через свойство записей. Раздел собирается сам — по файлам, пока они есть."
        />
      )}

      <ContentEditor
        listKey={listKey}
        api={filesApi}
        blockedSettings={{ maxDepth: 1, codeMode: CodeMode.None, isHistoryEnabled: false, isDraftEnabled: false }}
        settings={FILE_VIEW}
        fields={FILE_FIELDS}
        columns={FILE_COLUMNS}
      />
    </div>
  );
}
