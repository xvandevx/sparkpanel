import { useState, type ReactNode } from 'react';
import { theme } from 'antd';

/**
 * Значок действия: карандаш, крестик, корзина. Один на весь редактор — иначе
 * действия выглядят вразнобой: у кнопки antd своя высота и серый ховер-квадрат,
 * у штатного крестика вкладки ни того, ни другого, и рядом они не смотрятся.
 *
 * Поэтому рисуем сами: голый значок, приглушённый, в цвет при наведении
 * (у разрушающего действия — в красный). Размер и отступы всюду одинаковые.
 *
 * Недоступное действие показываем тем же значком, но бледным и без отклика:
 * пропавшая корзина заставила бы гадать, почему запись не удаляется, а
 * подсказка у замка объясняет это сразу.
 */
export default function ActionIcon({
  title,
  icon,
  isDanger = false,
  isDisabled = false,
  onClick,
}: {
  /** Подпись-подсказка; она же читается озвучкой */
  title: string;
  icon: ReactNode;
  /** Действие разрушающее: при наведении краснеет */
  isDanger?: boolean;
  /** Действие недоступно: значок только поясняет подсказкой, почему */
  isDisabled?: boolean;
  onClick?: () => void;
}) {
  const { token } = theme.useToken();
  const [isHovered, setIsHovered] = useState(false);

  const color = isDisabled
    ? token.colorTextQuaternary
    : isHovered
      ? isDanger
        ? token.colorError
        : token.colorText
      : token.colorTextTertiary;

  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-disabled={isDisabled}
      // Клик по значку не должен заодно открывать строку или переключать вкладку
      onClick={(event) => {
        event.stopPropagation();
        if (!isDisabled) onClick?.();
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="inline-flex items-center justify-center"
      style={{
        // preflight у Tailwind выключен — сброс кнопки задаём сами
        width: 24,
        height: 24,
        padding: 0,
        border: 'none',
        background: 'transparent',
        color,
        fontSize: 15,
        lineHeight: 1,
        cursor: isDisabled ? 'default' : 'pointer',
        transition: `color ${token.motionDurationMid}`,
      }}
    >
      {icon}
    </button>
  );
}
