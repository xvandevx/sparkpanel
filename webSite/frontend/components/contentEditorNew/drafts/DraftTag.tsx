import { Tag, Tooltip } from 'antd';
import { EditOutlined, EyeInvisibleOutlined } from '@ant-design/icons';
import type { EditorDraft } from '../../../redux/reducers/contentEditorNewReducer';

/**
 * Метка черновика у записи — в таблице рядом с названием и в шапке карточки.
 * «Только черновик» — запись ещё ни разу не публиковалась, на сайте её нет:
 * пунктир и перечёркнутый глаз отличают её от правок опубликованной.
 */
export default function DraftTag({ draft }: { draft: EditorDraft | null | undefined }) {
  if (!draft) return null;
  return draft.isNew ? (
    <Tooltip title="Записи ещё нет на сайте: она появится там после публикации">
      <Tag color="orange" icon={<EyeInvisibleOutlined />} style={{ borderStyle: 'dashed', marginInlineStart: 8 }}>
        Только черновик
      </Tag>
    </Tooltip>
  ) : (
    <Tag color="orange" icon={<EditOutlined />} style={{ marginInlineStart: 8 }}>
      Черновик
    </Tag>
  );
}
