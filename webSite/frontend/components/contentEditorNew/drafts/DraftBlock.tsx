import { Alert, Button, Space, Tooltip } from 'antd';
import { CloudUploadOutlined, EditOutlined, EyeInvisibleOutlined } from '@ant-design/icons';
import { formatDateTime } from '../../../logic/dateFormat';
import type { EditorDraft } from '../../../redux/reducers/contentEditorNewReducer';

/**
 * Блок черновика в карточке, над вкладками: чей и когда сохранён, и что с ним
 * сделать. Виден в режиме «Черновик»; один на все случаи — у правок
 * опубликованной записи, у записи «только в черновике» и у новой, — чтобы
 * кнопки стояли на одном месте.
 */
export default function DraftBlock({
  draft,
  isNewRecord,
  changedCount,
  publishBlock,
  isBusy,
  onPublish,
  onDiscard,
}: {
  /** Сохранённый черновик; null — его ещё нет */
  draft: EditorDraft | null;
  /** Запись заводят: в базе её ещё нет */
  isNewRecord: boolean;
  /** Сколько полей черновик меняет относительно опубликованного */
  changedCount: number;
  /**
   * Почему публиковать нельзя; null — можно. Публикуют только сохранённый
   * черновик и без несохранённых правок поверх: иначе непонятно, что уйдёт на сайт
   */
  publishBlock: string | null;
  isBusy: boolean;
  onPublish: () => void;
  onDiscard: () => void;
}) {
  if (isNewRecord) {
    return (
      <Alert
        type="warning"
        showIcon
        icon={<EditOutlined />}
        title="Новая запись"
        description="Сохранится черновиком: в панели появится, на сайт попадёт после публикации. Сразу на сайт — режим «Опубликовано»."
        style={{ marginBottom: 16 }}
      />
    );
  }

  // Подсказка — на обёртке: у закрытой кнопки antd наведение не ловит
  const publishButton = (
    <Tooltip title={publishBlock}>
      <span>
        <Button
          type="primary"
          icon={<CloudUploadOutlined />}
          loading={isBusy}
          disabled={publishBlock !== null}
          onClick={onPublish}
        >
          Опубликовать черновик
        </Button>
      </span>
    </Tooltip>
  );

  if (!draft) {
    return (
      <Alert
        type="warning"
        showIcon
        icon={<EditOutlined />}
        title="Черновика нет"
        description="Правки сохранятся черновиком и попадут на сайт после публикации."
        action={publishButton}
        style={{ marginBottom: 16 }}
      />
    );
  }

  return (
    <Alert
      type="warning"
      showIcon
      icon={draft.isNew ? <EyeInvisibleOutlined /> : <EditOutlined />}
      title={`Черновик · сохранён ${formatDateTime(draft.updatedAt)} · ${draft.authorEmail}`}
      description={
        draft.isNew
          ? 'Записи ещё нет на сайте — она появится после публикации.'
          : `Отличается от опубликованного: ${changedCount} ${fieldsWord(changedCount)}.`
      }
      action={
        <Space>
          {/* У записи «только в черновике» возвращаться не к чему — её удаляют целиком */}
          {!draft.isNew && (
            <Button danger disabled={isBusy} onClick={onDiscard}>
              Удалить черновик
            </Button>
          )}
          {publishButton}
        </Space>
      }
      style={{ marginBottom: 16 }}
    />
  );
}

/** «поле», «поля», «полей» — по числу. */
const fieldsWord = (count: number): string => {
  const tail = count % 100;
  if (tail >= 11 && tail <= 14) return 'полей';
  if (count % 10 === 1) return 'поле';
  if (count % 10 >= 2 && count % 10 <= 4) return 'поля';
  return 'полей';
};
