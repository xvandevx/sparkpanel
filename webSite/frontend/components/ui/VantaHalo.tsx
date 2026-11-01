import { useEffect, useRef } from 'react';

/**
 * Анимированный фон Vanta «halo» (three.js), на весь экран и под контентом.
 *
 * Параметры взяты один в один из конфигуратора vantajs.com.
 * Цвета там задаются числами; рядом — их hex, чтобы было понятно, что меняешь.
 */
const HALO_OPTIONS = {
  backgroundColor: 0x131a43, // 1251907  — тёмно-синий фон
  baseColor: 0x001a59, //       6745     — основной цвет кольца
  color2: 0xf2e735, //          15918901 — цвет бликов
  backgroundAlpha: 1,
  amplitudeFactor: 1,
  ringFactor: 1,
  rotationFactor: 1,
  size: 3,
  speed: 1,
  xOffset: 0,
  yOffset: 0,
  scale: 1,
  scaleMobile: 1,
  minHeight: 200,
  minWidth: 200,
  mouseControls: true,
  mouseEase: true,
  touchControls: true,
  gyroControls: false,
};

/** Фон совпадает с backgroundColor эффекта: виден, пока грузится three.js. */
export const VANTA_FALLBACK_BACKGROUND = '#131a43';

export default function VantaHalo() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // three и vanta работают только в браузере (лезут в window), поэтому грузим их
    // динамически внутри эффекта — на сервере этот код не выполняется.
    // Плюс ~600 КБ three не попадают в бандл страницы и тянутся отдельным чанком.
    let effect: { destroy: () => void } | undefined;
    let cancelled = false;

    (async () => {
      const [THREE, HALO] = await Promise.all([
        import('three'),
        import('vanta/dist/vanta.halo.min').then((m) => m.default),
      ]);
      if (cancelled || !containerRef.current) return;
      effect = HALO({ el: containerRef.current, THREE, ...HALO_OPTIONS });
    })();

    return () => {
      // Эффект держит WebGL-контекст и слушатели на window — без destroy они
      // утекают при каждом монтировании (в dev React монтирует компонент дважды).
      cancelled = true;
      effect?.destroy();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden
      className="fixed inset-0 z-0"
      style={{ backgroundColor: VANTA_FALLBACK_BACKGROUND }}
    />
  );
}
