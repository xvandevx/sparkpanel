import { useState } from 'react';
import { Checkbox, Empty, Input, Select, Spin, Typography } from 'antd';
import type { EditorMediaRules } from '../../../logic/editorForm';
import { useMediaLibrary, type MediaItem } from '../../../logic/mediaLibrary';
import styles from '../editorForm.module.scss';
import MediaThumb from './MediaThumb';

/**
 * Файлы медиатеки с поиском и фильтром по разделу. Клик по файлу — выбор,
 * у множественного свойства — отметка. Файл, который не подходит под ограничения
 * поля, виден, но выбрать его нельзя — рядом написано почему.
 *
 * Пропсы — только вид выбора, ограничения, отмеченное и куда сообщить о клике:
 * сами файлы берутся из logic-хука.
 */
export default function MediaLibraryList({
  multiple,
  rules,
  checked,
  busy,
  onToggle,
}: {
  multiple: boolean;
  rules?: EditorMediaRules;
  checked: number[];
  busy: boolean;
  onToggle: (item: MediaItem) => void;
}) {
  const { search, sectionOptions, isLoading, error } = useMediaLibrary();
  const [query, setQuery] = useState('');
  const [sectionId, setSectionId] = useState<number | null>(null);

  const items = search(query, sectionId, rules);

  return (
    <div className={styles.mediaPicker}>
      <div className={styles.mediaFilters}>
        <Input.Search
          allowClear
          placeholder="Поиск по имени и описанию"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <Select
          allowClear
          placeholder="Все разделы"
          style={{ minWidth: 200 }}
          value={sectionId ?? undefined}
          onChange={(next) => setSectionId(next ?? null)}
          options={sectionOptions}
        />
      </div>

      {error && <Typography.Text type="danger">{error}</Typography.Text>}

      {isLoading && items.length === 0 ? (
        <Spin />
      ) : items.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={query || sectionId ? 'Ничего не нашлось' : 'В медиатеке пока нет файлов'}
        />
      ) : (
        <Spin spinning={busy} size="small">
          <div className={styles.mediaGrid}>
            {items.map((item) => {
              const optionClass = item.blocked
                ? `${styles.mediaOption} ${styles.mediaOptionBlocked}`
                : styles.mediaOption;
              const body = (
                <>
                  <MediaThumb item={item} zoomable={false} />
                  <span className={styles.mediaInfo}>
                    <Typography.Text ellipsis>{item.name}</Typography.Text>
                    <Typography.Text
                      type={item.blocked ? 'danger' : 'secondary'}
                      ellipsis
                      style={{ fontSize: 12 }}
                    >
                      {item.blocked ? `Не подходит: ${item.blocked}` : item.details}
                    </Typography.Text>
                  </span>
                </>
              );

              // Отметка — чекбоксом в подписи: клик по карточке переключает его сам.
              // Одиночный выбор — кнопкой: клик сразу выбирает и закрывает окно.
              return multiple ? (
                <label
                  key={item.id}
                  className={optionClass}
                >
                  <Checkbox
                    checked={checked.includes(item.id)}
                    disabled={Boolean(item.blocked)}
                    onChange={() => onToggle(item)}
                  />
                  {body}
                </label>
              ) : (
                <button
                  key={item.id}
                  type="button"
                  disabled={Boolean(item.blocked) || busy}
                  className={optionClass}
                  onClick={() => onToggle(item)}
                >
                  {body}
                </button>
              );
            })}
          </div>
        </Spin>
      )}
    </div>
  );
}
