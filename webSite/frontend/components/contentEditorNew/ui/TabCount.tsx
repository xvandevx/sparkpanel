import { Tag } from 'antd';

/**
 * Счётчик в заголовке вкладки: «Свойства 11». Штатный `Tag` без рамки —
 * у открытой вкладки синий, как её подпись, у остальных серый. Один на окно
 * настроек: и у разделов окна, и у вкладок карточки он выглядит одинаково.
 */
export default function TabCount({ count, isActive }: { count: number; isActive: boolean }) {
  return (
    <Tag variant="filled" color={isActive ? 'blue' : undefined} style={{ marginInlineEnd: 0 }}>
      {count}
    </Tag>
  );
}
