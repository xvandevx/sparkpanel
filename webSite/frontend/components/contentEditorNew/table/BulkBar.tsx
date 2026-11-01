import { Button, ConfigProvider, Divider, theme, Typography } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import { BULK_LABELS, BulkAction } from './useBulkActions';

/**
 * Быстрые действия над отмеченными записями — плавающая тёмная «пилюля»
 * у нижнего края экрана, по центру раздела (макет — вариант A в Claude Design).
 *
 * Прилипает к низу (`sticky`), а не висит `fixed`: так она держится по центру
 * области раздела, не наезжает на левое меню и не зависит от того, свёрнуто ли
 * оно. Места в разметке не занимает: обёртка нулевой высоты, а сама панель
 * растёт из неё вверх (`items-end`) поверх таблицы — иначе под таблицей
 * оставалась бы пустая полоса её высоты.
 *
 * Цвета не свои: панель в тёмной теме antd (`darkAlgorithm`), фон, тень
 * и красный «Удалить» — её токены.
 */
export default function BulkBar({
  count,
  actions,
  runningAction,
  onRun,
  onClear,
}: {
  /** Сколько записей отмечено */
  count: number;
  /** Что умеет список: по кнопке на действие */
  actions: BulkAction[];
  /** Действие в работе: его кнопка крутится, остальные закрыты */
  runningAction: BulkAction | null;
  onRun: (action: BulkAction) => void;
  onClear: () => void;
}) {
  return (
    <div className="pointer-events-none sticky bottom-6 z-10 flex h-0 items-end justify-center">
      <ConfigProvider theme={{ algorithm: theme.darkAlgorithm }}>
        <Pill count={count} actions={actions} runningAction={runningAction} onRun={onRun} onClear={onClear} />
      </ConfigProvider>
    </div>
  );
}

/** Сама пилюля — внутри тёмной темы: токены берутся уже из неё. */
function Pill({
  count,
  actions,
  runningAction,
  onRun,
  onClear,
}: {
  count: number;
  actions: BulkAction[];
  runningAction: BulkAction | null;
  onRun: (action: BulkAction) => void;
  onClear: () => void;
}) {
  const { token } = theme.useToken();
  const isBusy = runningAction !== null;

  return (
    <div
      role="toolbar"
      aria-label="Действия с отмеченными записями"
      className="pointer-events-auto flex items-center gap-1 py-2 pl-5 pr-2"
      style={{
        background: token.colorBgElevated,
        borderRadius: token.borderRadiusLG,
        boxShadow: token.boxShadowSecondary,
      }}
    >
      <Typography.Text strong className="mr-2 whitespace-nowrap">
        Отмечено: {count}
      </Typography.Text>
      <Divider type="vertical" />
      {actions.map((action) => (
        <Button
          key={action}
          type="text"
          danger={action === BulkAction.Remove}
          loading={runningAction === action}
          disabled={isBusy && runningAction !== action}
          onClick={() => onRun(action)}
        >
          {BULK_LABELS[action]}
        </Button>
      ))}
      <Divider type="vertical" />
      <Button type="text" icon={<CloseOutlined />} aria-label="Снять отметку" title="Снять отметку" disabled={isBusy} onClick={onClear} />
    </div>
  );
}
