import { Image } from 'antd';
import { FileOutlined } from '@ant-design/icons';
import type { MediaItem } from '../../../logic/mediaLibrary';
import styles from '../editorForm.module.scss';

/**
 * Превью файла: картинка — уменьшенной копией, остальное — значком. Ломаная
 * картинка выглядела бы как ошибка, хотя её нет.
 *
 * `zoomable` — увеличение по клику. В списке выбора его нет: там клик по файлу
 * означает «выбрать», а не «посмотреть».
 */
export default function MediaThumb({
  item,
  zoomable = true,
}: {
  item: MediaItem | null;
  zoomable?: boolean;
}) {
  if (!item?.isImage) {
    return (
      <span className={styles.mediaThumbEmpty}>
        <FileOutlined />
      </span>
    );
  }

  return (
    <Image
      src={item.url}
      alt={item.name}
      width={56}
      height={56}
      className={styles.mediaThumb}
      rootClassName={styles.mediaThumbRoot}
      preview={zoomable ? { mask: null } : false}
    />
  );
}
