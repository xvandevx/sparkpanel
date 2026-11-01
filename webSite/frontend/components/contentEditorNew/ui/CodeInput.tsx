import { Button, Input, Space, Tooltip } from 'antd';
import { LinkOutlined } from '@ant-design/icons';

/**
 * Поле символьного кода с кнопкой «из названия». Нажата — код собирается
 * из названия латиницей и руками не правится, отжата — набирают свой.
 * Одно поле на все коды редактора: записи, свойства, варианта списка —
 * иначе одно и то же переключали бы в трёх местах по-разному.
 *
 * Сам код из названия поле не собирает: правило у каждого кода своё
 * (у свойства — через подчёркивание), и знает его тот, кто держит черновик.
 */
export default function CodeInput({
  value,
  isAuto,
  isLocked = false,
  placeholder,
  onChange,
  onAuto,
}: {
  value: string;
  /** Код собирается из названия: поле закрыто, кнопка нажата */
  isAuto: boolean;
  /** Правки не принимаем: запись пишется или открыта на просмотр */
  isLocked?: boolean;
  placeholder?: string;
  onChange: (code: string) => void;
  onAuto: (isAuto: boolean) => void;
}) {
  // «Не закрыто» — это `undefined`, а не `false`: `false` в `disabled` перебил бы
  // запрет шторки системного свойства (`ConfigProvider componentDisabled`)
  return (
    <Space.Compact style={{ width: '100%' }}>
      <Input
        value={value}
        placeholder={placeholder}
        disabled={isAuto || isLocked || undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      <Tooltip
        title={
          isAuto
            ? 'Код собирается из названия латиницей. Нажмите, чтобы задать свой'
            : 'Собирать код из названия латиницей'
        }
      >
        <Button
          type={isAuto ? 'primary' : 'default'}
          icon={<LinkOutlined />}
          aria-label="Код из названия"
          aria-pressed={isAuto}
          disabled={isLocked || undefined}
          onClick={() => onAuto(!isAuto)}
        />
      </Tooltip>
    </Space.Compact>
  );
}
