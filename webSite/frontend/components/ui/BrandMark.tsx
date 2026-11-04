import clsx from 'clsx';
import { useId } from 'react';

interface BrandMarkProps {
  /** Показать название рядом со значком */
  withWordmark?: boolean;
  /** Свой логотип из настроек сайта вместо SparkPanel; пусто — SparkPanel */
  logoUrl?: string;
  /** Подпись своего логотипа для читалок экрана — название сайта */
  logoAlt?: string;
  className?: string;
}

/**
 * Логотип SparkPanel: искра и название. Рисуется на тёмном фоне (левое меню,
 * экран входа), поэтому «Spark» белым, «Panel» светло-серым. Исходник знака —
 * `brand/sparkpanel-mark.svg` в корне репозитория.
 *
 * Свой логотип (`logoUrl`) рисуется картинкой той же высоты, что знак, —
 * целиком, без названия рядом: название обычно уже в нём.
 */
export default function BrandMark({
  withWordmark = true,
  logoUrl,
  logoAlt,
  className,
}: BrandMarkProps) {
  // У градиента свой id на каждый логотип: на странице их бывает два
  const gradientId = useId();

  if (logoUrl) {
    return (
      <div className={clsx('flex items-center', className)}>
        <img
          src={logoUrl}
          alt={logoAlt || 'Логотип'}
          style={{ height: 36, width: 'auto', maxWidth: '100%', objectFit: 'contain' }}
        />
      </div>
    );
  }

  return (
    <div className={clsx('flex items-center gap-3', className)}>
      <svg aria-hidden width={22} height={36} viewBox="0 0 64 108">
        <defs>
          <linearGradient id={gradientId} x1="1" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#FBA24B" />
            <stop offset="0.55" stopColor="#F67841" />
            <stop offset="1" stopColor="#F24357" />
          </linearGradient>
        </defs>
        <path
          fill={`url(#${gradientId})`}
          d="M48.5 2L49 27C49 36 38 44 27 49C18 53 12 64 12 70C6 66 2 58 2 51C2 36 27 18 48.5 2Z"
        />
        <path
          fill={`url(#${gradientId})`}
          d="M49.5 40.5C55 45 62 52 62 61C62 75 28 98 16 105L16 90C16 78 30 66 38 61C44 57.5 49 53 49 46Z"
        />
      </svg>
      {withWordmark && (
        <span className="text-2xl tracking-tight text-white">
          <span className="font-bold">Spark</span>
          <span className="font-normal" style={{ color: 'rgba(255,255,255,0.72)' }}>
            Panel
          </span>
        </span>
      )}
    </div>
  );
}
