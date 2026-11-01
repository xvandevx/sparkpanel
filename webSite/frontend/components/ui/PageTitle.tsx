import type { ReactNode } from 'react';
import { Typography } from 'antd';

/**
 * Заголовок раздела над его содержимым: «Страницы сайта», «Настройки сайта».
 * Один на все экраны — иначе соседние разделы называли бы себя кто как:
 * разным уровнем, с разными отступами. Отдельной шапки у приложения нет
 * (`layout/AppShell`), поэтому название раздела стоит здесь.
 */
export default function PageTitle({ children }: { children: ReactNode }) {
  return (
    <Typography.Title level={4} style={{ margin: 0 }}>
      {children}
    </Typography.Title>
  );
}
