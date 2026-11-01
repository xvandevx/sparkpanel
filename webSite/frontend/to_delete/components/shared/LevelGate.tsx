import type { ReactNode } from 'react';
import { Button, Card, Empty, Result, Skeleton } from 'antd';

interface LevelGateProps {
  isLoading: boolean;
  loadFailed: boolean;
  error: string | null;
  /** Уровень загружен, но такой записи нет */
  isMissing: boolean;
  missingText: string;
  /** Заголовок отказа: раздел называет себя сам — компонент общий */
  failedText: string;
  /** Куда уводить, когда показывать нечего */
  onBack: () => void;
  backLabel: string;
  children: ReactNode;
}

/**
 * Что показать до содержимого страницы: индикатор, отказ загрузки или
 * «такого больше нет». Так ведёт себя всякий вложенный уровень — и типы
 * с инфоблоками, и разделы медиатеки, — поэтому компонент общий.
 *
 * Пока структура не приехала, экран ждёт: сказать «тип удалён» раньше,
 * чем пришёл ответ, значило бы соврать.
 */
export default function LevelGate({
  isLoading,
  loadFailed,
  error,
  isMissing,
  missingText,
  failedText,
  onBack,
  backLabel,
  children,
}: LevelGateProps) {
  if (isLoading) {
    return (
      <Card>
        <Skeleton active paragraph={{ rows: 6 }} />
      </Card>
    );
  }

  if (loadFailed) {
    return (
      <Card>
        <Result
          status="warning"
          title={failedText}
          subTitle={error}
          extra={
            <Button type="primary" onClick={onBack}>
              {backLabel}
            </Button>
          }
        />
      </Card>
    );
  }

  if (isMissing) {
    return (
      <Card>
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={missingText}>
          <Button type="primary" onClick={onBack}>
            {backLabel}
          </Button>
        </Empty>
      </Card>
    );
  }

  return <>{children}</>;
}
