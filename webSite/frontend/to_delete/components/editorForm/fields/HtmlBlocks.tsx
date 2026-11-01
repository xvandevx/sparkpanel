import { Select, Tag, Tooltip, Typography } from 'antd';
import {
  attachedHtmlBlocks,
  HtmlBlockStatus,
  htmlBlockToken,
  type EditorHtmlBlock,
} from '../../../logic/editorForm';
import styles from '../editorForm.module.scss';

/** Подсказка на метке подключённого блока — по его состоянию. */
const STATUS_HINT: Record<HtmlBlockStatus, string> = {
  [HtmlBlockStatus.Active]: 'Открыть блок в новой вкладке',
  [HtmlBlockStatus.Inactive]: 'Блок выключен — на сайте на его месте будет пусто',
  [HtmlBlockStatus.Missing]: 'Блока с таким кодом нет — на сайте на его месте будет пусто',
};

const STATUS_COLOR: Record<HtmlBlockStatus, string> = {
  [HtmlBlockStatus.Active]: 'blue',
  [HtmlBlockStatus.Inactive]: 'warning',
  [HtmlBlockStatus.Missing]: 'error',
};

/**
 * Подключение HTML-блоков под полем разметки: выбор блока вставляет его маркер
 * в позицию курсора, ниже — какие блоки уже подключены и не битые ли они.
 */
export default function HtmlBlocks({
  html,
  blocks,
  disabled,
  onInsert,
}: {
  html: string;
  blocks: EditorHtmlBlock[];
  disabled: boolean;
  onInsert: (code: string) => void;
}) {
  const attached = attachedHtmlBlocks(html, blocks);

  return (
    <>
      <div className={styles.variables}>
        <Select<string | null>
          value={null}
          disabled={disabled}
          placeholder="Подключить HTML-блок"
          style={{ minWidth: 300 }}
          showSearch={{ optionFilterProp: ['label', 'code'] }}
          notFoundContent="HTML-блоков не найдено"
          // Выбор не остаётся значением: он только вставляет маркер в текст
          onChange={(code) => code && onInsert(code)}
          options={blocks.map((block) => ({
            value: block.code,
            label: block.name,
            code: block.code,
          }))}
          optionRender={(option) => (
            <div>
              <div>{option.data.label}</div>
              <Typography.Text type="secondary" className={styles.mono} style={{ fontSize: 12 }}>
                {htmlBlockToken(String(option.data.code))}
              </Typography.Text>
            </div>
          )}
        />
      </div>

      {attached.length > 0 && (
        <div className={styles.variables}>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Подключены:
          </Typography.Text>
          {attached.map(({ code, block, status }) => (
            <Tooltip key={code} title={STATUS_HINT[status]}>
              <Tag color={STATUS_COLOR[status]} style={{ margin: 0 }}>
                {block ? (
                  <a href={block.href} target="_blank" rel="noreferrer">
                    {block.name}
                  </a>
                ) : (
                  <span className={styles.mono}>{htmlBlockToken(code)}</span>
                )}
              </Tag>
            </Tooltip>
          ))}
        </div>
      )}
    </>
  );
}
