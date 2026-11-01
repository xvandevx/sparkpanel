/**
 * У vanta нет собственных типов — объявляем минимум, который используем.
 * Эффект грузится динамически (только в браузере): внутри он трогает window.
 */
declare module 'vanta/dist/vanta.halo.min' {
  interface VantaEffect {
    destroy: () => void;
    resize: () => void;
  }

  interface VantaHaloOptions {
    el: HTMLElement;
    THREE: unknown;
    amplitudeFactor?: number;
    backgroundAlpha?: number;
    backgroundColor?: number;
    baseColor?: number;
    color2?: number;
    gyroControls?: boolean;
    minHeight?: number;
    minWidth?: number;
    mouseControls?: boolean;
    mouseEase?: boolean;
    ringFactor?: number;
    rotationFactor?: number;
    scale?: number;
    scaleMobile?: number;
    size?: number;
    speed?: number;
    touchControls?: boolean;
    xOffset?: number;
    yOffset?: number;
  }

  const HALO: (options: VantaHaloOptions) => VantaEffect;
  export default HALO;
}
