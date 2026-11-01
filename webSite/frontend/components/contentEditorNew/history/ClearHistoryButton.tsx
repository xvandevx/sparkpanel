import { Button } from 'antd';
import { ClearOutlined } from '@ant-design/icons';
import { useClearHistory } from './useHistory';

/**
 * «Очистить историю» — одна кнопка на журнал списка и на историю записи:
 * без `recordId` чистит весь журнал списка. Где ей стоять, решает тот, кто
 * её ставит: над журналом списка, в строке вкладок карточки.
 */
export default function ClearHistoryButton({
  listKey,
  recordId,
  isEmpty = false,
  onCleared,
}: {
  listKey: string;
  /** Запись, историю которой чистим; не задан — весь журнал списка */
  recordId?: string;
  /** Чистить нечего — кнопка закрыта. Не знает тот, кто ставит, — открыта */
  isEmpty?: boolean;
  /** Журнал очищен — показанное надо перечитать */
  onCleared: () => void;
}) {
  const { isClearing, clear } = useClearHistory(listKey, recordId, onCleared);

  return (
    <Button danger icon={<ClearOutlined />} loading={isClearing} disabled={isEmpty} onClick={clear}>
      Очистить историю
    </Button>
  );
}
