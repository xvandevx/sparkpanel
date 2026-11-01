/**
 * Медиатека «Фаркоп.ру»: шесть разделов (товары, баннеры, документы, иконки,
 * сертификаты, новости) и по 5–10 файлов в каждом. Все файлы собираются здесь же,
 * в Node, без сети: PNG — zlib + CRC32 (градиенты и фигуры: фаркопы, баннеры,
 * сертификаты), SVG-иконки, минимальные PDF, CSV-прайс и TXT.
 *
 * Идемпотентность: раздел ищется по коду, файл — по имени внутри своего раздела.
 * Повторный запуск ничего не загружает заново.
 *
 * Размеры картинок — от 64×64 до 2400×600 (шире 1920 — чтобы было на чём проверить
 * ограничения по разрешению); все файлы лёгкие, большинство меньше 200 КБ.
 */
import { deflateSync } from 'node:zlib';
import { ensure, get, log, post, upload } from './lib.mjs';

const SECTION = 'files';

/* ------------------------------------------------------------------ PNG -- */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) crc = CRC_TABLE[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

const hex = (value) => {
  const clean = value.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(clean.slice(i, i + 2), 16));
};

const clamp01 = (value) => (value < 0 ? 0 : value > 1 ? 1 : value);

/** Холст RGB: фон-градиент и фигуры со сглаживанием краёв, на выходе — PNG. */
class Canvas {
  constructor(width, height) {
    this.w = width;
    this.h = height;
    this.px = new Float32Array(width * height * 3);
  }

  blend(index, rgb, alpha) {
    if (alpha <= 0) return;
    const a = alpha > 1 ? 1 : alpha;
    const px = this.px;
    px[index] += (rgb[0] - px[index]) * a;
    px[index + 1] += (rgb[1] - px[index + 1]) * a;
    px[index + 2] += (rgb[2] - px[index + 2]) * a;
  }

  /** Линейный градиент по нескольким цветам под углом (градусы). */
  gradient(stops, angle = 90) {
    const colors = stops.map(hex);
    const rad = (angle * Math.PI) / 180;
    const dx = Math.cos(rad);
    const dy = Math.sin(rad);
    const corners = [0, this.w * dx, this.h * dy, this.w * dx + this.h * dy];
    const min = Math.min(...corners);
    const span = Math.max(...corners) - min || 1;
    const segments = colors.length - 1;

    for (let y = 0; y < this.h; y += 1) {
      for (let x = 0; x < this.w; x += 1) {
        const t = clamp01((x * dx + y * dy - min) / span) * segments;
        const i = Math.min(Math.floor(t), segments - 1);
        const f = t - i;
        const a = colors[i];
        const b = colors[i + 1];
        const o = (y * this.w + x) * 3;
        this.px[o] = a[0] + (b[0] - a[0]) * f;
        this.px[o + 1] = a[1] + (b[1] - a[1]) * f;
        this.px[o + 2] = a[2] + (b[2] - a[2]) * f;
      }
    }
    return this;
  }

  /** Обходит пиксели прямоугольника и смешивает цвет с покрытием от `coverage(x, y)`. */
  paint(x0, y0, x1, y1, color, alpha, coverage) {
    const rgb = hex(color);
    const xs = Math.max(0, Math.floor(x0));
    const ys = Math.max(0, Math.floor(y0));
    const xe = Math.min(this.w, Math.ceil(x1));
    const ye = Math.min(this.h, Math.ceil(y1));
    for (let y = ys; y < ye; y += 1) {
      for (let x = xs; x < xe; x += 1) {
        const cover = coverage(x + 0.5, y + 0.5);
        if (cover > 0) this.blend((y * this.w + x) * 3, rgb, cover * alpha);
      }
    }
    return this;
  }

  /** Мягкое свечение (эллипс), к краю гаснет до нуля. */
  glow(cx, cy, rx, ry, color, alpha = 0.5) {
    return this.paint(cx - rx, cy - ry, cx + rx, cy + ry, color, alpha, (x, y) => {
      const d = Math.hypot((x - cx) / rx, (y - cy) / ry);
      return d < 1 ? (1 - d) * (1 - d) : 0;
    });
  }

  circle(cx, cy, r, color, alpha = 1) {
    return this.paint(cx - r - 1, cy - r - 1, cx + r + 1, cy + r + 1, color, alpha, (x, y) =>
      clamp01(r + 0.5 - Math.hypot(x - cx, y - cy)),
    );
  }

  ring(cx, cy, r, thickness, color, alpha = 1) {
    return this.paint(cx - r - 1, cy - r - 1, cx + r + 1, cy + r + 1, color, alpha, (x, y) =>
      clamp01(thickness / 2 + 0.5 - Math.abs(Math.hypot(x - cx, y - cy) - (r - thickness / 2))),
    );
  }

  /** Прямоугольник со скруглением углов. */
  rect(x, y, width, height, color, alpha = 1, radius = 0) {
    const cx = x + width / 2;
    const cy = y + height / 2;
    const hx = width / 2;
    const hy = height / 2;
    const r = Math.min(radius, hx, hy);
    return this.paint(x - 1, y - 1, x + width + 1, y + height + 1, color, alpha, (px, py) => {
      const qx = Math.abs(px - cx) - hx + r;
      const qy = Math.abs(py - cy) - hy + r;
      const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0));
      const sdf = outside + Math.min(Math.max(qx, qy), 0) - r;
      return clamp01(0.5 - sdf);
    });
  }

  /** Отрезок заданной толщины с круглыми концами. */
  line(x1, y1, x2, y2, width, color, alpha = 1) {
    const pad = width / 2 + 1;
    const vx = x2 - x1;
    const vy = y2 - y1;
    const len2 = vx * vx + vy * vy || 1;
    return this.paint(
      Math.min(x1, x2) - pad,
      Math.min(y1, y2) - pad,
      Math.max(x1, x2) + pad,
      Math.max(y1, y2) + pad,
      color,
      alpha,
      (x, y) => {
        const t = clamp01(((x - x1) * vx + (y - y1) * vy) / len2);
        const d = Math.hypot(x - (x1 + vx * t), y - (y1 + vy * t));
        return clamp01(width / 2 + 0.5 - d);
      },
    );
  }

  /** Ломаная из нескольких отрезков. */
  polyline(points, width, color, alpha = 1) {
    for (let i = 1; i < points.length; i += 1) {
      this.line(points[i - 1][0], points[i - 1][1], points[i][0], points[i][1], width, color, alpha);
    }
    return this;
  }

  /** Диагональные полосы в прямоугольной области. */
  stripes(x, y, width, height, angle, period, thickness, color, alpha = 0.1) {
    const rad = (angle * Math.PI) / 180;
    const dx = Math.cos(rad);
    const dy = Math.sin(rad);
    return this.paint(x, y, x + width, y + height, color, alpha, (px, py) => {
      const p = (((px * dx + py * dy) % period) + period) % period;
      return p < thickness ? 1 : 0;
    });
  }

  /** Лёгкий детерминированный шум — «фактура» фото; заметно увеличивает размер файла. */
  noise(amplitude, seed = 1) {
    let state = seed >>> 0 || 1;
    for (let i = 0; i < this.px.length; i += 1) {
      state ^= state << 13;
      state ^= state >>> 17;
      state ^= state << 5;
      this.px[i] += ((state >>> 0) / 0xffffffff - 0.5) * 2 * amplitude;
    }
    return this;
  }

  /** PNG truecolor 8 бит, фильтр Sub на каждой строке — градиенты сжимаются в разы лучше. */
  png() {
    const stride = this.w * 3;
    const raw = Buffer.alloc((stride + 1) * this.h);
    for (let y = 0; y < this.h; y += 1) {
      const row = y * (stride + 1);
      raw[row] = 1;
      let prev0 = 0;
      let prev1 = 0;
      let prev2 = 0;
      for (let x = 0; x < this.w; x += 1) {
        const o = (y * this.w + x) * 3;
        const r = Math.max(0, Math.min(255, Math.round(this.px[o])));
        const g = Math.max(0, Math.min(255, Math.round(this.px[o + 1])));
        const b = Math.max(0, Math.min(255, Math.round(this.px[o + 2])));
        const d = row + 1 + x * 3;
        raw[d] = (r - prev0) & 0xff;
        raw[d + 1] = (g - prev1) & 0xff;
        raw[d + 2] = (b - prev2) & 0xff;
        prev0 = r;
        prev1 = g;
        prev2 = b;
      }
    }

    const header = Buffer.alloc(13);
    header.writeUInt32BE(this.w, 0);
    header.writeUInt32BE(this.h, 4);
    header[8] = 8; // глубина цвета
    header[9] = 2; // truecolor RGB
    header[10] = 0;
    header[11] = 0;
    header[12] = 0;

    return Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      pngChunk('IHDR', header),
      pngChunk('IDAT', deflateSync(raw, { level: 9 })),
      pngChunk('IEND', Buffer.alloc(0)),
    ]);
  }
}

/* ------------------------------------------------------- PNG: сюжеты -- */

const BRAND = '#f26b1d';
const STEEL = '#2b2f36';
const CHROME = '#c9ced6';

/** Фаркоп в прямоугольнике (x, y, w, h): поперечина, кронштейны, шея и шар. */
function drawTowbar(c, x, y, w, h, options = {}) {
  const { bar = STEEL, ball = CHROME, accent = BRAND, kind = 'ball' } = options;
  const barY = y + h * 0.38;
  const barH = Math.max(3, h * 0.08);
  const left = x + w * 0.06;
  const right = x + w * 0.94;

  // Кронштейны крепления к лонжеронам
  for (const bx of [left, right - w * 0.07]) {
    c.rect(bx, y + h * 0.12, w * 0.07, barY - y - h * 0.1, bar, 1, w * 0.012);
    c.circle(bx + w * 0.035, y + h * 0.2, Math.max(1.5, h * 0.022), '#f4f5f7');
    c.circle(bx + w * 0.035, y + h * 0.3, Math.max(1.5, h * 0.022), '#f4f5f7');
  }

  // Поперечина с бликом
  c.rect(left, barY, right - left, barH, bar, 1, barH / 2);
  c.rect(left + barH / 2, barY + barH * 0.15, right - left - barH, barH * 0.22, '#ffffff', 0.22, barH * 0.1);

  const neckX = x + w * 0.5;
  const neckW = Math.max(3, h * 0.07);

  if (kind === 'flange') {
    // Фланцевый фаркоп: шар на плите с двумя болтами
    c.rect(neckX - w * 0.07, barY + barH * 0.5, w * 0.14, h * 0.3, bar, 1, w * 0.01);
    c.circle(neckX - w * 0.035, barY + h * 0.24, h * 0.025, '#f4f5f7');
    c.circle(neckX + w * 0.035, barY + h * 0.24, h * 0.025, '#f4f5f7');
    c.rect(neckX - w * 0.02, barY + h * 0.38, w * 0.04, h * 0.1, bar, 1, 2);
    c.circle(neckX, barY + h * 0.55, h * 0.09, ball);
    c.circle(neckX - h * 0.03, barY + h * 0.52, h * 0.03, '#ffffff', 0.7);
    return;
  }

  const bendX = neckX + w * (kind === 'detachable' ? 0.1 : 0.06);
  const bendY = barY + h * 0.36;
  const tipX = bendX + w * 0.1;
  const tipY = bendY - h * 0.1;

  c.polyline(
    [
      [neckX, barY + barH / 2],
      [neckX + w * 0.015, bendY - h * 0.05],
      [bendX, bendY],
      [tipX, tipY],
    ],
    neckW,
    bar,
  );

  if (kind === 'detachable') {
    // Съёмный шар: замок на поперечине и кольцо фиксации
    c.rect(neckX - w * 0.04, barY - barH * 0.4, w * 0.08, barH * 1.8, '#4a505a', 1, 4);
    c.ring(neckX, barY + barH / 2, barH * 0.7, Math.max(1.5, barH * 0.25), accent);
  }

  c.circle(tipX + h * 0.02, tipY - h * 0.08, h * 0.085, ball);
  c.circle(tipX - h * 0.01, tipY - h * 0.11, h * 0.03, '#ffffff', 0.75);

  // Подрозетник с розеткой
  const socketX = neckX - w * 0.13;
  c.rect(socketX - w * 0.03, barY + barH, w * 0.06, h * 0.16, '#3a3f47', 1, 3);
  c.circle(socketX, barY + barH + h * 0.12, h * 0.055, '#16181c');
  c.ring(socketX, barY + barH + h * 0.12, h * 0.055, Math.max(1.5, h * 0.012), accent);
}

/** Студийное «фото» товара: светлый фон, тень, сам товар, плашка бренда. */
function productImage(width, height, options = {}) {
  const { bg = ['#f7f8fa', '#dfe3e8'], accent = BRAND, kind = 'ball', noise = 0, seed = 1 } = options;
  const c = new Canvas(width, height).gradient(bg, 90);
  c.glow(width * 0.5, height * 0.86, width * 0.42, height * 0.07, '#000000', 0.25);
  c.glow(width * 0.3, height * 0.2, width * 0.5, height * 0.4, '#ffffff', 0.5);

  if (kind === 'socket') {
    // Розетка 13 pin: корпус, крышка, контакты по кругу, кабель
    const cx = width * 0.5;
    const cy = height * 0.48;
    const r = Math.min(width, height) * 0.24;
    c.polyline(
      [
        [cx, cy + r * 0.8],
        [cx + r * 0.3, cy + r * 1.5],
        [cx + r * 1.3, cy + r * 1.6],
        [width * 0.95, cy + r * 1.2],
      ],
      r * 0.16,
      '#1b1d21',
    );
    c.circle(cx, cy, r * 1.08, '#3a3f47');
    c.circle(cx, cy, r, '#16181c');
    c.ring(cx, cy, r, r * 0.08, accent);
    for (let i = 0; i < 12; i += 1) {
      const a = (i / 12) * Math.PI * 2;
      c.circle(cx + Math.cos(a) * r * 0.62, cy + Math.sin(a) * r * 0.62, r * 0.08, '#d9b45a');
    }
    c.circle(cx, cy, r * 0.1, '#d9b45a');
    c.rect(cx - r * 0.25, cy - r * 1.35, r * 0.5, r * 0.3, '#3a3f47', 1, r * 0.05);
  } else if (kind === 'wiring') {
    // Блок согласования с жгутами проводов
    const bx = width * 0.36;
    const by = height * 0.32;
    const bw = width * 0.28;
    const bh = height * 0.3;
    const wires = ['#e53935', '#43a047', '#fdd835', '#1e88e5', '#8d6e63', '#212121', '#ffffff'];
    wires.forEach((color, i) => {
      const yy = by + bh * (0.15 + i * 0.11);
      c.polyline(
        [
          [bx + bw, yy],
          [bx + bw + width * 0.08, yy + height * 0.05],
          [width * 0.95, yy + height * 0.12 + i * 3],
        ],
        Math.max(2, height * 0.012),
        color,
      );
      c.polyline(
        [
          [bx, yy],
          [bx - width * 0.1, yy - height * 0.04],
          [width * 0.05, yy - height * 0.1 - i * 3],
        ],
        Math.max(2, height * 0.012),
        color,
      );
    });
    c.rect(bx, by, bw, bh, '#1f2227', 1, height * 0.03);
    c.rect(bx + bw * 0.1, by + bh * 0.12, bw * 0.8, bh * 0.25, accent, 1, height * 0.01);
    c.circle(bx + bw * 0.2, by + bh * 0.72, height * 0.015, '#4caf50');
    c.circle(bx + bw * 0.32, by + bh * 0.72, height * 0.015, '#ff9800');
  } else if (kind === 'bracket') {
    // Рамка под номер на фаркоп
    const px = width * 0.15;
    const py = height * 0.3;
    const pw = width * 0.7;
    const ph = height * 0.26;
    c.rect(px - 6, py - 6, pw + 12, ph + 12, STEEL, 1, 10);
    c.rect(px, py, pw, ph, '#ffffff', 1, 6);
    c.rect(px + pw * 0.06, py + ph * 0.2, pw * 0.62, ph * 0.6, '#d5d9df', 1, 4);
    c.rect(px + pw * 0.74, py + ph * 0.15, pw * 0.2, ph * 0.5, '#1e5fbf', 1, 3);
    c.rect(px + pw * 0.35, py + ph + 6, pw * 0.3, height * 0.12, STEEL, 1, 4);
    c.circle(px + pw * 0.42, py + ph + height * 0.08, height * 0.018, '#f4f5f7');
    c.circle(px + pw * 0.58, py + ph + height * 0.08, height * 0.018, '#f4f5f7');
  } else {
    drawTowbar(c, width * 0.08, height * 0.12, width * 0.84, height * 0.7, { accent, kind });
  }

  // Плашка бренда в углу
  c.rect(width * 0.04, height * 0.05, width * 0.16, height * 0.06, accent, 1, height * 0.03);
  if (noise) c.noise(noise, seed);
  return c.png();
}

/** Рекламный баннер: яркий градиент, декор, плашка «текста», кнопка и фаркоп. */
function bannerImage(width, height, options = {}) {
  const {
    stops = ['#ff7a1a', '#e63946'],
    angle = 20,
    accent = '#ffd166',
    plate = 'left',
    towbar = true,
    seed = 0,
  } = options;
  const c = new Canvas(width, height).gradient(stops, angle);
  const unit = Math.min(width, height);

  c.glow(width * 0.85, height * 0.1, unit * 0.9, unit * 0.9, '#ffffff', 0.25);
  c.glow(width * 0.1, height * 1.0, unit * 0.8, unit * 0.6, '#000000', 0.2);
  c.stripes(0, 0, width, height, 60, unit * 0.18, unit * 0.04, '#ffffff', 0.06);
  for (let i = 0; i < 6; i += 1) {
    const k = (i * 37 + seed * 11) % 100;
    c.circle(width * (0.05 + k / 110), height * (0.1 + ((i * 53) % 90) / 100), unit * (0.02 + (i % 3) * 0.015), '#ffffff', 0.18);
  }

  const textX = plate === 'left' ? width * 0.06 : width * 0.52;
  const textW = width * 0.42;
  c.rect(textX, height * 0.2, textW * 0.9, unit * 0.11, '#ffffff', 0.95, unit * 0.03);
  c.rect(textX, height * 0.2 + unit * 0.16, textW * 0.7, unit * 0.06, '#ffffff', 0.7, unit * 0.02);
  c.rect(textX, height * 0.2 + unit * 0.26, textW * 0.55, unit * 0.06, '#ffffff', 0.7, unit * 0.02);
  c.rect(textX, height * 0.2 + unit * 0.4, textW * 0.38, unit * 0.12, accent, 1, unit * 0.06);

  if (towbar) {
    const tx = plate === 'left' ? width * 0.52 : width * 0.04;
    c.glow(tx + width * 0.22, height * 0.55, width * 0.26, height * 0.4, '#ffffff', 0.35);
    drawTowbar(c, tx, height * 0.15, width * 0.42, height * 0.75, { accent, bar: '#1d2026' });
  }
  return c.png();
}

/** Картинка к новости: фон, «карточка-фото» с сюжетом и плашка даты. */
function newsImage(width, height, options = {}) {
  const { stops = ['#1d3557', '#457b9d'], accent = BRAND, scene = 'towbar', seed = 0 } = options;
  const c = new Canvas(width, height).gradient(stops, 135);
  const unit = Math.min(width, height);
  c.glow(width * 0.2, height * 0.2, unit * 0.8, unit * 0.8, '#ffffff', 0.15);

  const cardX = width * 0.08;
  const cardY = height * 0.12;
  const cardW = width * 0.84;
  const cardH = height * 0.62;
  c.rect(cardX + 6, cardY + 10, cardW, cardH, '#000000', 0.18, unit * 0.04);
  c.rect(cardX, cardY, cardW, cardH, '#f3f5f8', 1, unit * 0.04);

  if (scene === 'warehouse') {
    // Стеллажи склада с коробками
    for (let s = 0; s < 4; s += 1) {
      const sx = cardX + cardW * (0.06 + s * 0.235);
      c.rect(sx, cardY + cardH * 0.1, cardW * 0.2, cardH * 0.8, '#90a4ae', 1, 4);
      for (let shelf = 0; shelf < 3; shelf += 1) {
        const sy = cardY + cardH * (0.15 + shelf * 0.25);
        c.rect(sx + 4, sy, cardW * 0.2 - 8, cardH * 0.2, '#eceff1', 1, 2);
        for (let b = 0; b < 3; b += 1) {
          const tone = ['#c8a165', '#b88a4a', '#d9b98a'][(b + shelf + s + seed) % 3];
          c.rect(sx + 8 + b * cardW * 0.062, sy + cardH * 0.06, cardW * 0.055, cardH * 0.13, tone, 1, 2);
        }
      }
    }
  } else if (scene === 'trailer') {
    // Машина с прицепом на дороге
    c.rect(cardX, cardY + cardH * 0.72, cardW, cardH * 0.28, '#455a64', 1, 0);
    c.stripes(cardX, cardY + cardH * 0.84, cardW, cardH * 0.03, 0, cardW * 0.1, cardW * 0.05, '#ffffff', 0.9);
    c.rect(cardX + cardW * 0.08, cardY + cardH * 0.42, cardW * 0.36, cardH * 0.26, accent, 1, unit * 0.03);
    c.rect(cardX + cardW * 0.16, cardY + cardH * 0.28, cardW * 0.2, cardH * 0.16, accent, 1, unit * 0.03);
    c.rect(cardX + cardW * 0.19, cardY + cardH * 0.31, cardW * 0.14, cardH * 0.1, '#b3e5fc', 1, unit * 0.01);
    c.line(cardX + cardW * 0.44, cardY + cardH * 0.6, cardX + cardW * 0.52, cardY + cardH * 0.6, unit * 0.012, STEEL);
    c.rect(cardX + cardW * 0.52, cardY + cardH * 0.38, cardW * 0.38, cardH * 0.28, '#eceff1', 1, unit * 0.01);
    c.rect(cardX + cardW * 0.52, cardY + cardH * 0.38, cardW * 0.38, cardH * 0.05, '#78909c', 1, unit * 0.01);
    for (const wx of [0.16, 0.36, 0.71]) {
      c.circle(cardX + cardW * wx, cardY + cardH * 0.7, unit * 0.05, '#212121');
      c.circle(cardX + cardW * wx, cardY + cardH * 0.7, unit * 0.022, '#bdbdbd');
    }
  } else if (scene === 'sale') {
    // Ценник со скидкой
    c.rect(cardX + cardW * 0.25, cardY + cardH * 0.15, cardW * 0.5, cardH * 0.7, accent, 1, unit * 0.05);
    c.circle(cardX + cardW * 0.32, cardY + cardH * 0.27, unit * 0.03, '#f3f5f8');
    c.line(cardX + cardW * 0.42, cardY + cardH * 0.7, cardX + cardW * 0.6, cardY + cardH * 0.3, unit * 0.03, '#ffffff');
    c.ring(cardX + cardW * 0.42, cardY + cardH * 0.36, unit * 0.06, unit * 0.025, '#ffffff');
    c.ring(cardX + cardW * 0.6, cardY + cardH * 0.64, unit * 0.06, unit * 0.025, '#ffffff');
  } else if (scene === 'service') {
    // Подъёмник в установочном центре
    c.rect(cardX + cardW * 0.1, cardY + cardH * 0.1, cardW * 0.05, cardH * 0.8, '#546e7a', 1, 4);
    c.rect(cardX + cardW * 0.85, cardY + cardH * 0.1, cardW * 0.05, cardH * 0.8, '#546e7a', 1, 4);
    c.rect(cardX + cardW * 0.15, cardY + cardH * 0.42, cardW * 0.7, cardH * 0.05, '#ffb300', 1, 3);
    c.rect(cardX + cardW * 0.22, cardY + cardH * 0.18, cardW * 0.56, cardH * 0.22, '#37474f', 1, unit * 0.04);
    drawTowbar(c, cardX + cardW * 0.3, cardY + cardH * 0.5, cardW * 0.4, cardH * 0.4, { accent });
  } else {
    drawTowbar(c, cardX + cardW * 0.15, cardY + cardH * 0.1, cardW * 0.7, cardH * 0.8, { accent, kind: 'detachable' });
  }

  // Плашка даты и строки «заголовка»
  c.rect(cardX + cardW * 0.03, cardY + cardH * 0.05, unit * 0.2, unit * 0.07, accent, 1, unit * 0.02);
  c.rect(cardX, height * 0.8, cardW * 0.75, unit * 0.05, '#ffffff', 0.92, unit * 0.015);
  c.rect(cardX, height * 0.8 + unit * 0.08, cardW * 0.5, unit * 0.035, '#ffffff', 0.6, unit * 0.012);
  return c.png();
}

/** Сертификат: кремовый лист, рамка, печать, «строки» текста и подпись. */
function certificateImage(width, height, options = {}) {
  const { seal = '#c62828', frame = '#b08d57' } = options;
  const c = new Canvas(width, height).gradient(['#fffaf0', '#f3e9d2'], 100);
  const m = Math.min(width, height) * 0.04;
  c.rect(m, m, width - 2 * m, height - 2 * m, frame, 1, 6);
  c.rect(m + 6, m + 6, width - 2 * m - 12, height - 2 * m - 12, '#fffaf0', 1, 4);
  c.rect(m + 14, m + 14, width - 2 * m - 28, height - 2 * m - 28, frame, 0.5, 4);
  c.rect(m + 17, m + 17, width - 2 * m - 34, height - 2 * m - 34, '#fffcf5', 1, 3);

  c.rect(width * 0.3, height * 0.14, width * 0.4, height * 0.06, '#3e2723', 0.9, 6);
  c.rect(width * 0.36, height * 0.23, width * 0.28, height * 0.025, frame, 0.9, 4);
  for (let i = 0; i < 6; i += 1) {
    const lw = [0.7, 0.64, 0.68, 0.5, 0.6, 0.44][i];
    c.rect(width * (0.5 - lw / 2), height * (0.33 + i * 0.06), width * lw, height * 0.018, '#6d4c41', 0.55, 3);
  }

  const sx = width * 0.75;
  const sy = height * 0.78;
  const sr = Math.min(width, height) * 0.1;
  c.circle(sx, sy, sr, seal, 0.85);
  c.ring(sx, sy, sr * 0.85, sr * 0.06, '#ffffff', 0.8);
  c.ring(sx, sy, sr * 0.6, sr * 0.04, '#ffffff', 0.7);
  c.polyline(
    [
      [width * 0.16, height * 0.82],
      [width * 0.2, height * 0.76],
      [width * 0.23, height * 0.83],
      [width * 0.27, height * 0.75],
      [width * 0.3, height * 0.82],
      [width * 0.36, height * 0.79],
    ],
    Math.max(2, height * 0.005),
    '#1a237e',
  );
  c.line(width * 0.14, height * 0.85, width * 0.4, height * 0.85, 2, '#6d4c41', 0.6);
  return c.png();
}

/** Значок сайта: оранжевый квадрат со скруглением и белый фаркоп. */
function iconImage(size) {
  const c = new Canvas(size, size).gradient(['#ffffff', '#ffffff'], 0);
  c.rect(0, 0, size, size, BRAND, 1, size * 0.22);
  c.glow(size * 0.3, size * 0.25, size * 0.6, size * 0.5, '#ffffff', 0.25);
  const s = size / 64;
  c.line(12 * s, 22 * s, 46 * s, 22 * s, 6 * s, '#ffffff');
  c.polyline(
    [
      [29 * s, 22 * s],
      [29 * s, 38 * s],
      [33 * s, 44 * s],
      [42 * s, 44 * s],
    ],
    5 * s,
    '#ffffff',
  );
  c.circle(48 * s, 42 * s, 7 * s, '#ffffff');
  return c.png();
}

/* ------------------------------------------------------------------ SVG -- */

const svgIcon = (title, body, color = BRAND) =>
  `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
  <title>${title}</title>
  ${body}
</svg>
`;

const socketPins = Array.from({ length: 6 }, (_, i) => {
  const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
  return `<circle cx="${(12 + Math.cos(a) * 5).toFixed(2)}" cy="${(12 + Math.sin(a) * 5).toFixed(2)}" r="0.9" fill="${BRAND}" stroke="none"/>`;
}).join('\n  ');

/* ------------------------------------------------------------------ PDF -- */

/** Только ASCII: стандартные шрифты PDF не знают кириллицы. */
const pdfText = (value) =>
  String(value)
    .replace(/[^\x20-\x7e]/g, '?')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');

/** Строка метаданных PDF в UTF-16BE: так в свойствах документа видна кириллица. */
const pdfUnicode = (value) => {
  const bytes = [0xfe, 0xff];
  for (const ch of String(value)) {
    const code = ch.codePointAt(0);
    if (code > 0xffff) continue;
    bytes.push(code >> 8, code & 0xff);
  }
  return `<${Buffer.from(bytes).toString('hex').toUpperCase()}>`;
};

const wrap = (text, width) => {
  const lines = [];
  let line = '';
  for (const word of String(text).split(/\s+/)) {
    if (line && (line + ' ' + word).length > width) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) lines.push(line);
  return lines;
};

/**
 * Документ A4 из блоков: заголовки, абзацы, списки, таблицы и поля «ключ — значение».
 * Шапка с логотипом и подвал с номером страницы на каждом листе; перенос на новую
 * страницу — когда кончается место.
 */
function pdfDocument({ title, heading, subtitle, blocks, footer, demo = false }) {
  const W = 595;
  const H = 842;
  const M = 56;
  const pages = [];
  let ops = [];
  let y = 0;

  const text = (x, yy, size, value, { bold = false, color = '0.13 0.14 0.16' } = {}) =>
    ops.push(`BT /${bold ? 'F2' : 'F1'} ${size} Tf ${color} rg ${x} ${yy} Td (${pdfText(value)}) Tj ET`);
  const fill = (x, yy, w, h, color) => ops.push(`${color} rg ${x} ${yy} ${w} ${h} re f`);
  const stroke = (x1, y1, x2, y2, color = '0.8 0.82 0.85') =>
    ops.push(`${color} RG 0.6 w ${x1} ${y1} m ${x2} ${y2} l S`);

  const newPage = () => {
    if (ops.length) pages.push(ops);
    ops = [];
    fill(0, H - 64, W, 64, '0.949 0.42 0.114');
    text(M, H - 40, 20, 'FARKOP.RU', { bold: true, color: '1 1 1' });
    text(M, H - 55, 9, 'Towbars, wiring kits and installation since 2009', { color: '1 1 1' });
    text(W - M - 150, H - 40, 10, '+7 (800) 555-35-35', { bold: true, color: '1 1 1' });
    text(W - M - 150, H - 54, 9, 'info@farkop.ru', { color: '1 1 1' });
    y = H - 100;
  };

  const ensureSpace = (needed) => {
    if (y - needed < 70) newPage();
  };

  newPage();
  text(M, y, 18, heading, { bold: true });
  y -= 22;
  if (subtitle) {
    text(M, y, 10, subtitle, { color: '0.4 0.42 0.46' });
    y -= 16;
  }
  stroke(M, y, W - M, y, '0.949 0.42 0.114');
  y -= 22;

  for (const block of blocks) {
    if (block.h) {
      ensureSpace(40);
      y -= 6;
      text(M, y, 12.5, block.h, { bold: true });
      y -= 18;
    } else if (block.p) {
      for (const line of wrap(block.p, 92)) {
        ensureSpace(14);
        text(M, y, 10, line);
        y -= 14;
      }
      y -= 6;
    } else if (block.list) {
      block.list.forEach((item, index) => {
        const marker = block.ordered ? `${index + 1}.` : '-';
        wrap(item, 86).forEach((line, i) => {
          ensureSpace(14);
          if (i === 0) text(M + 4, y, 10, marker, { bold: block.ordered });
          text(M + 22, y, 10, line);
          y -= 14;
        });
      });
      y -= 6;
    } else if (block.fields) {
      for (const [key, value] of block.fields) {
        ensureSpace(20);
        text(M, y, 10, key, { color: '0.4 0.42 0.46' });
        text(M + 170, y, 10, value, { bold: true });
        stroke(M, y - 6, W - M, y - 6);
        y -= 20;
      }
      y -= 8;
    } else if (block.table) {
      const { cols, rows } = block.table;
      const widths = cols.map((col) => col.width);
      const drawRow = (cells, header) => {
        ensureSpace(20);
        if (header) fill(M, y - 6, W - 2 * M, 19, '0.95 0.95 0.96');
        let x = M + 4;
        cells.forEach((cell, i) => {
          text(x, y, 9.5, cell, { bold: header });
          x += widths[i];
        });
        stroke(M, y - 6, W - M, y - 6);
        y -= 19;
      };
      drawRow(cols.map((col) => col.title), true);
      for (const row of rows) drawRow(row, false);
      y -= 10;
    }
  }
  pages.push(ops);

  const objects = [];
  const add = (body) => {
    objects.push(body);
    return objects.length;
  };

  const catalogId = add(null);
  const pagesId = add(null);
  const fontRegular = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  const fontBold = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  const pageIds = pages.map((pageOps, index) => {
    const footerOps = [
      `0.8 0.82 0.85 RG 0.6 w ${M} 50 m ${W - M} 50 l S`,
      `BT /F1 8 Tf 0.45 0.47 0.5 rg ${M} 36 Td (${pdfText(footer ?? 'Farkop.ru - farkop.ru')}) Tj ET`,
      `BT /F1 8 Tf 0.45 0.47 0.5 rg ${W - M - 40} 36 Td (${pdfText(`Page ${index + 1} of ${pages.length}`)}) Tj ET`,
      ...(demo ? [`BT /F2 8 Tf 0.75 0.3 0.1 rg ${M} 24 Td (${pdfText('Demo document - SparkPanel sample data, not a legal document')}) Tj ET`] : []),
    ];
    const stream = [...pageOps, ...footerOps].join('\n');
    const contentId = add(`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`);
    return add(
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${W} ${H}] ` +
        `/Resources << /Font << /F1 ${fontRegular} 0 R /F2 ${fontBold} 0 R >> >> /Contents ${contentId} 0 R >>`,
    );
  });
  objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;
  const infoId = add(
    `<< /Title ${pdfUnicode(title)} /Author ${pdfUnicode('Фаркоп.ру')} /Producer (SparkPanel seed) ` +
      `/CreationDate (D:20260915100000+03'00') >>`,
  );

  let out = '%PDF-1.4\n%\xe2\xe3\xcf\xd3\n';
  const offsets = [];
  objects.forEach((body, index) => {
    offsets.push(Buffer.byteLength(out, 'latin1'));
    out += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefAt = Buffer.byteLength(out, 'latin1');
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) out += `${String(offset).padStart(10, '0')} 00000 n \n`;
  out += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R /Info ${infoId} 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`;
  return Buffer.from(out, 'latin1');
}

/** Сертификат соответствия: общий шаблон, отличаются реквизиты. */
const certificatePdf = ({ title, heading, number, fields, scope }) =>
  pdfDocument({
    title,
    heading,
    subtitle: `Registration number ${number}`,
    demo: true,
    footer: 'Copy certified by Farkop.ru, original kept at the head office',
    blocks: [
      { fields },
      { h: 'Scope' },
      { p: scope },
      { h: 'Conformity assessment' },
      {
        p: 'Products comply with the requirements of Technical Regulation of the Customs Union TR CU 018/2011 "On the safety of wheeled vehicles", UNECE Regulation No. 55 (mechanical coupling components) and GOST R 41.55-2005.',
      },
    ],
  });

/* ------------------------------------------------------------- CSV / TXT -- */

const PRICE_ROWS = [
  ['BS-0412', 'Фаркоп Bosal с шаром тип A', 'Kia', 'Rio IV (2017–2022)', 'A', '1300', '6 490', '3 500', 'в наличии'],
  ['BS-0427', 'Фаркоп Bosal съёмный тип F', 'Hyundai', 'Creta II (2021–)', 'F', '1500', '11 900', '3 500', 'в наличии'],
  ['WF-3051', 'Фаркоп Westfalia вертикальный съёмный', 'Volkswagen', 'Tiguan II (2016–)', 'V', '2000', '54 300', '6 000', 'под заказ, 5 дней'],
  ['WF-3108', 'Фаркоп Westfalia фланцевый', 'Skoda', 'Kodiaq (2017–)', 'G', '2000', '32 700', '5 000', 'в наличии'],
  ['AV-1123', 'Фаркоп Автос с шаром тип A', 'Lada', 'Vesta (2015–)', 'A', '1100', '4 350', '2 800', 'в наличии'],
  ['AV-1167', 'Фаркоп Автос усиленный', 'Lada', 'Niva Legend (4x4)', 'A', '1500', '3 990', '2 500', 'в наличии'],
  ['LP-2204', 'Фаркоп Лидер Плюс с шаром тип A', 'Renault', 'Duster II (2021–)', 'A', '1500', '5 790', '3 000', 'в наличии'],
  ['LP-2231', 'Фаркоп Лидер Плюс быстросъёмный', 'Toyota', 'RAV4 XA50 (2019–)', 'F', '1800', '12 450', '4 000', 'мало'],
  ['BT-5015', 'Фаркоп Baltex фланцевый', 'Mitsubishi', 'Outlander III', 'G', '1900', '8 900', '3 500', 'в наличии'],
  ['BT-5042', 'Фаркоп Baltex с квадратом 50 мм', 'Toyota', 'Land Cruiser Prado 150', 'E', '3000', '16 800', '4 500', 'в наличии'],
  ['BS-0490', 'Фаркоп Bosal для пикапа', 'Ford', 'Ranger (2012–2022)', 'E', '3500', '18 200', '4 500', 'под заказ, 7 дней'],
  ['WF-3177', 'Фаркоп Westfalia съёмный тип A40', 'BMW', 'X5 G05 (2018–)', 'V', '2700', '86 500', '9 000', 'под заказ, 10 дней'],
  ['TH-7001', 'Электрика Thule 13 pin, штатная', 'Volkswagen', 'Tiguan II (2016–)', '—', '—', '24 900', '6 500', 'в наличии'],
  ['SC-0210', 'Блок согласования Smart Connect', 'универсальный', 'CAN-шина', '—', '—', '4 300', '2 000', 'в наличии'],
  ['SC-0215', 'Электрика универсальная 7 pin', 'универсальный', 'любая модель', '—', '—', '1 950', '1 500', 'в наличии'],
  ['AC-0031', 'Розетка 13 pin с подрозетником', 'универсальный', '—', '—', '—', '890', '—', 'в наличии'],
  ['AC-0044', 'Переходник 7 → 13 pin', 'универсальный', '—', '—', '—', '650', '—', 'в наличии'],
  ['AC-0058', 'Кронштейн номера на фаркоп', 'универсальный', '—', '—', '—', '520', '—', 'в наличии'],
  ['AC-0062', 'Заглушка шара с логотипом', 'универсальный', '—', '—', '—', '290', '—', 'в наличии'],
  ['AC-0075', 'Велобагажник на фаркоп на 3 велосипеда', 'универсальный', '—', '—', '—', '18 900', '—', 'мало'],
];

const priceCsv = () => {
  const header = ['Артикул', 'Наименование', 'Марка', 'Модель', 'Тип шара', 'Нагрузка, кг', 'Цена, руб.', 'Установка, руб.', 'Наличие'];
  const quote = (cell) => (/[;"\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell);
  const lines = [header, ...PRICE_ROWS].map((row) => row.map(quote).join(';'));
  // BOM — чтобы Excel сам понял, что файл в UTF-8
  return `﻿${lines.join('\r\n')}\r\n`;
};

const RETURN_POLICY = `Правила возврата и обмена товара — интернет-магазин «Фаркоп.ру»

1. Возврат товара надлежащего качества
   Фаркоп, электрику или аксессуар, который не устанавливался, можно вернуть в течение 14 дней
   с момента получения. Сохраните упаковку, заводские пломбы, полный комплект крепежа
   и кассовый чек или электронный чек из письма.

2. Что вернуть нельзя
   — товар со следами монтажа (затяжка болтов, царапины на кронштейнах, подрезанные провода);
   — электрику, подключённую к штатной проводке автомобиля;
   — товар, изготовленный под заказ по VIN-номеру.

3. Товар с недостатком
   Если обнаружили брак — напишите на info@farkop.ru или позвоните по номеру 8 (800) 555-35-35.
   Приложите фото маркировки и номер заказа. Проверку качества проводим за 3–10 рабочих дней,
   доставку бракованного товара в обе стороны оплачиваем мы.

4. Как вернуть деньги
   Деньги возвращаем тем же способом, которым был оплачен заказ, в течение 10 дней после
   получения товара на склад. Стоимость доставки до покупателя при возврате товара надлежащего
   качества не возвращается.

5. Установка в нашем центре
   Если фаркоп ставили наши мастера, гарантия распространяется и на монтаж: 3 года на работу,
   5 лет на сам фаркоп. Повторная регулировка и протяжка крепежа через 1000 км — бесплатно.

Адреса пунктов приёма: Москва, Варшавское шоссе, 125, стр. 1; Химки, ул. Ленинградская, 29;
Санкт-Петербург, Софийская ул., 14. Ежедневно с 9:00 до 21:00.
`;

const REQUISITES = `Реквизиты компании (демонстрационные данные)

Полное наименование: Общество с ограниченной ответственностью «Фаркоп Ру»
Сокращённое наименование: ООО «Фаркоп Ру»
Юридический адрес: 117105, г. Москва, Варшавское шоссе, д. 125, стр. 1, офис 304
Почтовый адрес: тот же
ИНН / КПП: 7700000000 / 770001001
ОГРН: 1000000000000
Банк: АО «Демо Банк», г. Москва
Расчётный счёт: 40702810000000000000
Корреспондентский счёт: 30101810000000000000
БИК: 044500000

Генеральный директор: Соколов Андрей Викторович, действует на основании Устава
Главный бухгалтер: Мельникова Ольга Сергеевна

Телефон: 8 (800) 555-35-35 (бесплатно по России)
Электронная почта для документов: buh@farkop.ru
Сайт: https://farkop.ru
`;

const HOLIDAY_SCHEDULE = `График работы в ноябрьские праздники

С 1 по 4 ноября установочные центры «Фаркоп.ру» работают по особому расписанию:

1 ноября, суббота — с 10:00 до 18:00
2 ноября, воскресенье — с 10:00 до 18:00
3 ноября, понедельник — с 10:00 до 16:00
4 ноября, вторник (День народного единства) — выходной
С 5 ноября — в обычном режиме, ежедневно с 9:00 до 21:00

Интернет-магазин принимает заказы круглосуточно. Заказы, оформленные 3–4 ноября,
отправим 5 ноября в первой половине дня. Запись на установку на праздничные дни —
по телефону 8 (800) 555-35-35 или в личном кабинете на сайте.
`;

/* --------------------------------------------------------- Содержимое -- */

const png = (name, description, build) => ({ name, type: 'image/png', description, build });
const svg = (name, description, title, body) => ({
  name,
  type: 'image/svg+xml',
  description,
  build: () => Buffer.from(svgIcon(title, body), 'utf8'),
});
const pdf = (name, description, build) => ({ name, type: 'application/pdf', description, build });
const txt = (name, description, content) => ({
  name,
  type: 'text/plain',
  description,
  build: () => Buffer.from(content, 'utf8'),
});

const SECTIONS = [
  {
    code: 'products',
    name: 'Товары',
    files: [
      png('farkop-bosal-kia-rio.png', 'Фаркоп Bosal для Kia Rio IV с шаром тип A — основное фото карточки товара', () =>
        productImage(1200, 900, { kind: 'ball' }),
      ),
      png('farkop-westfalia-vw-tiguan.png', 'Съёмный фаркоп Westfalia для Volkswagen Tiguan II — вид спереди', () =>
        productImage(1000, 750, { kind: 'detachable', accent: '#1e5fbf' }),
      ),
      png('farkop-avtos-lada-vesta.png', 'Фаркоп Автос для Lada Vesta, сварной, с порошковой покраской', () =>
        productImage(800, 600, { kind: 'ball', bg: ['#fdfdfd', '#e9ecef'], accent: '#d62828' }),
      ),
      png('farkop-leader-plus-renault-duster.png', 'Фаркоп Лидер Плюс для Renault Duster II — квадратное фото для каталога', () =>
        productImage(800, 800, { kind: 'ball', bg: ['#f1f4f8', '#cfd8e3'], accent: '#2a9d8f' }),
      ),
      png('farkop-baltex-flanec-outlander.png', 'Фланцевый фаркоп Baltex для Mitsubishi Outlander — шар на плите с двумя болтами', () =>
        productImage(900, 675, { kind: 'flange', accent: '#6a4c93' }),
      ),
      png('rozetka-13pin.png', 'Розетка фаркопа 13 pin с подрозетником, европейский стандарт ISO 11446', () =>
        productImage(600, 600, { kind: 'socket' }),
      ),
      png('blok-soglasovaniya-smart-connect.png', 'Блок согласования Smart Connect для автомобилей с CAN-шиной', () =>
        productImage(640, 480, { kind: 'wiring', accent: '#0081a7' }),
      ),
      png('kronshtein-nomera.png', 'Кронштейн-рамка номерного знака на фаркоп, крепится под шар', () =>
        productImage(400, 400, { kind: 'bracket', noise: 1.5, seed: 23 }),
      ),
    ],
  },
  {
    code: 'banners',
    name: 'Баннеры',
    files: [
      png('banner-autumn-sale-2400x600.png', 'Широкий баннер осенней распродажи на главную, 2400×600 — для экранов Retina', () =>
        bannerImage(2400, 600, { stops: ['#ff7a1a', '#e63946', '#9d0208'], angle: 15 }),
      ),
      png('banner-installation-1600x900.png', 'Баннер «Установка фаркопа за 2 часа» для раздела услуг', () =>
        bannerImage(1600, 900, { stops: ['#1d3557', '#457b9d'], angle: 35, accent: BRAND, plate: 'right', seed: 2 }),
      ),
      png('banner-free-delivery-1920x500.png', 'Баннер «Бесплатная доставка от 5000 ₽» под шапкой каталога', () =>
        bannerImage(1920, 500, { stops: ['#2a9d8f', '#264653'], angle: 0, accent: '#e9c46a', seed: 3 }),
      ),
      png('banner-catalog-1200x400.png', 'Баннер подбора фаркопа по марке автомобиля для страницы «Каталог»', () =>
        bannerImage(1200, 400, { stops: ['#3a0ca3', '#7209b7', '#f72585'], angle: 25, accent: '#4cc9f0', seed: 4 }),
      ),
      png('banner-mobile-750x1000.png', 'Вертикальный баннер акции для мобильной версии сайта', () =>
        bannerImage(750, 1000, { stops: ['#f77f00', '#d62828'], angle: 80, towbar: false, seed: 5 }),
      ),
      png('banner-kia-sportage-980x300.png', 'Баннер спецпредложения: фаркоп с установкой для Kia Sportage', () =>
        bannerImage(980, 300, { stops: ['#05668d', '#00a896'], angle: 10, accent: '#f0f3bd', plate: 'right', seed: 6 }),
      ),
    ],
  },
  {
    code: 'docs',
    name: 'Документы',
    files: [
      pdf('instrukciya-montazha-farkopa.pdf', 'Инструкция по самостоятельному монтажу фаркопа: инструмент, порядок работ, моменты затяжки', () =>
        pdfDocument({
          title: 'Инструкция по монтажу фаркопа',
          heading: 'Towbar installation guide',
          subtitle: 'For bolt-on towbars with ball type A, F and G. Read before you start.',
          blocks: [
            { h: 'Before you start' },
            {
              p: 'Check that the towbar article matches your vehicle model and production year. Make sure the kit is complete: crossbar, two side brackets, tow ball, socket plate, fasteners and spacers. Installation takes 1.5 to 3 hours and requires two people.',
            },
            { h: 'Tools' },
            {
              list: [
                'Socket set 13, 17, 19 and 22 mm, torque wrench 20-150 Nm',
                'Drill with 10 mm and 12 mm bits (for some models only)',
                'Plastic trim removal tools, anti-corrosion wax, wire brush',
              ],
            },
            { h: 'Installation steps' },
            {
              ordered: true,
              list: [
                'Remove the rear bumper or its lower trim, following the vehicle service manual.',
                'Remove the factory bumper beam or plugs from the chassis rails, if fitted.',
                'Clean the mounting points on the chassis rails and treat them with anti-corrosion wax.',
                'Fit the side brackets loosely, insert the crossbar and align it with the rails.',
                'Tighten all bolts to the torque listed below, starting from the central ones.',
                'Install the tow ball and the socket plate, then refit the bumper.',
                'Cut the bumper trim along the template if the towbar requires it.',
                'Connect the wiring kit and check every light on the trailer socket.',
              ],
            },
            { h: 'Tightening torque' },
            {
              table: {
                cols: [
                  { title: 'Bolt', width: 120 },
                  { title: 'Class', width: 100 },
                  { title: 'Torque, Nm', width: 110 },
                  { title: 'Where used', width: 160 },
                ],
                rows: [
                  ['M8', '8.8', '25', 'socket plate'],
                  ['M10', '8.8', '50', 'side brackets'],
                  ['M12', '10.9', '85', 'crossbar to brackets'],
                  ['M14', '10.9', '130', 'flange ball'],
                  ['M16', '10.9', '180', 'heavy duty towbars'],
                ],
              },
            },
            { h: 'Final checks' },
            {
              p: 'Re-tighten all fasteners after the first 1000 km. Keep the tow ball greased and close it with a cap when not in use. Register the towbar data in the vehicle documents if required by local regulations.',
            },
          ],
        }),
      ),
      pdf('dogovor-oferta.pdf', 'Публичная оферта интернет-магазина: условия заказа, оплаты, доставки и возврата', () =>
        pdfDocument({
          title: 'Договор публичной оферты',
          heading: 'Public offer agreement',
          subtitle: 'Edition of 15 September 2026. Applies to all orders placed on farkop.ru.',
          blocks: [
            { h: '1. General provisions' },
            {
              p: 'This document is an official offer of Farkop Ru LLC (the Seller) to conclude a retail sale agreement for towbars, wiring kits and car accessories presented on the website farkop.ru. Placing an order means full acceptance of these terms.',
            },
            { h: '2. Ordering' },
            {
              p: 'The Buyer places an order on the website or by phone. The Seller confirms availability and delivery time within one business day. Prices are final at the moment the order is confirmed.',
            },
            { h: '3. Payment' },
            {
              list: [
                'Bank card or SBP fast payment on the website',
                'Cash or card upon pickup at an installation center',
                'Bank transfer for legal entities based on the invoice',
              ],
            },
            { h: '4. Delivery' },
            {
              p: 'Delivery within Moscow and St. Petersburg takes 1-2 days, to other regions 3-10 days by transport companies. Delivery is free for orders over 5000 rubles.',
            },
            { h: '5. Returns and warranty' },
            {
              p: 'Goods that were not installed may be returned within 14 days. The warranty on towbars is 5 years, on wiring kits 2 years, on installation works 3 years.',
            },
            { h: '6. Seller details' },
            { fields: [['Company', 'Farkop Ru LLC'], ['Address', 'Moscow, Varshavskoe shosse 125/1'], ['E-mail', 'info@farkop.ru']] },
          ],
        }),
      ),
      pdf('garantijnyj-talon.pdf', 'Бланк гарантийного талона на фаркоп и установку — заполняется мастером при выдаче', () =>
        pdfDocument({
          title: 'Гарантийный талон',
          heading: 'Warranty card',
          subtitle: 'Towbar warranty 5 years, installation warranty 3 years',
          blocks: [
            {
              fields: [
                ['Product', '____________________________'],
                ['Article', '____________________________'],
                ['Vehicle make and model', '____________________________'],
                ['VIN', '____________________________'],
                ['Date of installation', '____ . ____ . 20____'],
                ['Installation center', '____________________________'],
                ['Technician', '____________________________'],
              ],
            },
            { h: 'Warranty terms' },
            {
              list: [
                'The warranty is valid when this card is presented together with the receipt.',
                'Fasteners must be re-tightened after the first 1000 km (free of charge in our centers).',
                'The warranty does not cover damage from accidents, overloading or corrosion caused by road chemicals.',
                'Wiring kits are covered for 2 years if connected by a certified technician.',
              ],
            },
          ],
        }),
      ),
      pdf('prajs-list-ustanovka.pdf', 'Прайс-лист на установку фаркопов и электрики в установочных центрах', () =>
        pdfDocument({
          title: 'Прайс-лист на установку',
          heading: 'Installation price list',
          subtitle: 'Valid from 1 October 2026. Prices in rubles, VAT included.',
          blocks: [
            {
              table: {
                cols: [
                  { title: 'Service', width: 260 },
                  { title: 'Time', width: 80 },
                  { title: 'Price, RUB', width: 110 },
                ],
                rows: [
                  ['Towbar installation, sedan / hatchback', '1.5 h', '3 500'],
                  ['Towbar installation, crossover / SUV', '2 h', '4 500'],
                  ['Towbar installation with bumper cut', '2.5 h', '5 500'],
                  ['Detachable towbar installation', '2.5 h', '6 000'],
                  ['Universal 7 pin wiring', '1 h', '1 500'],
                  ['Smart Connect module wiring', '1.5 h', '2 000'],
                  ['Vehicle specific 13 pin wiring', '2.5 h', '6 500'],
                  ['Activation of trailer mode in ECU', '0.5 h', '2 500'],
                  ['Towbar removal', '1 h', '2 000'],
                  ['Re-tightening after 1000 km', '0.3 h', 'free'],
                ],
              },
            },
            { h: 'Notes' },
            {
              p: 'The final price is confirmed after inspection of the vehicle. Book an installation slot at farkop.ru or by phone 8 (800) 555-35-35.',
            },
          ],
        }),
      ),
      {
        name: 'Прайс-лист Фаркоп.ру 2026.csv',
        type: 'text/csv',
        description: 'Розничный прайс-лист на фаркопы, электрику и аксессуары с ценами установки (CSV для Excel)',
        build: () => Buffer.from(priceCsv(), 'utf8'),
      },
      txt('pravila-vozvrata.txt', 'Правила возврата и обмена товара — текст для страницы «Покупателям»', RETURN_POLICY),
      txt('Реквизиты компании.txt', 'Реквизиты ООО «Фаркоп Ру» для договоров и счетов (демонстрационные)', REQUISITES),
    ],
  },
  {
    code: 'icons',
    name: 'Иконки',
    files: [
      svg('icon-towbar.svg', 'Иконка фаркопа для меню каталога', 'Фаркоп', '<path d="M2 8h12"/>\n  <path d="M4 8V5M12 8V5"/>\n  <path d="M8 8v4.5a3 3 0 0 0 3 3h4"/>\n  <circle cx="18" cy="15.5" r="2.5"/>'),
      svg('icon-delivery.svg', 'Иконка доставки для блока преимуществ', 'Доставка', '<path d="M1 6h12v9H1z"/>\n  <path d="M13 9h4l3 3v3h-7z"/>\n  <circle cx="5" cy="17.5" r="1.8"/>\n  <circle cx="16.5" cy="17.5" r="1.8"/>'),
      svg('icon-wrench.svg', 'Иконка установки — гаечный ключ, для раздела услуг', 'Установка', '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.1L3 17.7 6.3 21l6.3-6.3a4 4 0 0 0 5.1-5.4l-2.6 2.6-2.3-.4-.4-2.3z"/>'),
      svg('icon-shield.svg', 'Иконка гарантии: щит с галочкой', 'Гарантия', '<path d="M12 2l8 3v6c0 5-3.4 9.4-8 11-4.6-1.6-8-6-8-11V5z"/>\n  <path d="M8.5 12l2.5 2.5 4.5-5"/>'),
      svg('icon-phone.svg', 'Иконка телефона для шапки и контактов', 'Телефон', '<rect x="7" y="2" width="10" height="20" rx="2"/>\n  <path d="M11 18h2"/>'),
      svg('icon-map-pin.svg', 'Иконка адреса установочного центра на карте', 'Адрес', '<path d="M12 22s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z"/>\n  <circle cx="12" cy="10" r="2.5"/>'),
      svg('icon-socket.svg', 'Иконка розетки фаркопа для раздела электрики', 'Электрика', `<circle cx="12" cy="12" r="9"/>\n  ${socketPins}\n  <circle cx="12" cy="12" r="1.2" fill="${BRAND}" stroke="none"/>`),
      svg('icon-card.svg', 'Иконка оплаты картой для оформления заказа', 'Оплата', '<rect x="2" y="5" width="20" height="14" rx="2"/>\n  <path d="M2 10h20M6 15h4"/>'),
      png('favicon-64.png', 'Значок сайта 64×64 для вкладки браузера', () => iconImage(64)),
      png('apple-touch-icon-180.png', 'Значок 180×180 для ярлыка на экране iPhone', () => iconImage(180)),
    ],
  },
  {
    code: 'certificates',
    name: 'Сертификаты',
    files: [
      pdf('sertifikat-tr-ts-bosal.pdf', 'Сертификат соответствия ТР ТС 018/2011 на фаркопы Bosal', () =>
        certificatePdf({
          title: 'Сертификат соответствия ТР ТС — Bosal',
          heading: 'Certificate of conformity',
          number: 'EAEU RU C-BE.DEMO.B.00412/26',
          fields: [
            ['Applicant', 'Farkop Ru LLC, Moscow'],
            ['Manufacturer', 'Bosal, Belgium'],
            ['Products', 'Towbars (coupling devices), class A50-X'],
            ['Issued', '12 January 2026'],
            ['Valid until', '11 January 2031'],
          ],
          scope: 'Bolt-on towbars with fixed ball type A and detachable type F for passenger cars and crossovers, maximum towing mass up to 2000 kg.',
        }),
      ),
      pdf('sertifikat-tr-ts-westfalia.pdf', 'Сертификат соответствия ТР ТС 018/2011 на съёмные фаркопы Westfalia', () =>
        certificatePdf({
          title: 'Сертификат соответствия ТР ТС — Westfalia',
          heading: 'Certificate of conformity',
          number: 'EAEU RU C-DE.DEMO.B.03051/25',
          fields: [
            ['Applicant', 'Farkop Ru LLC, Moscow'],
            ['Manufacturer', 'Westfalia-Automotive, Germany'],
            ['Products', 'Detachable and vertical towbars'],
            ['Issued', '3 June 2025'],
            ['Valid until', '2 June 2030'],
          ],
          scope: 'Detachable towbars with vertical ball neck for passenger cars and SUVs, maximum towing mass up to 2700 kg, vertical load up to 100 kg.',
        }),
      ),
      pdf('deklaraciya-sootvetstviya-avtos.pdf', 'Декларация о соответствии на фаркопы Автос для автомобилей Lada', () =>
        certificatePdf({
          title: 'Декларация о соответствии — Автос',
          heading: 'Declaration of conformity',
          number: 'EAEU N RU D-RU.DEMO.B.01123/26',
          fields: [
            ['Applicant', 'Farkop Ru LLC, Moscow'],
            ['Manufacturer', 'AvtoS, Russia'],
            ['Products', 'Towbars for Lada vehicles'],
            ['Registered', '20 February 2026'],
            ['Valid until', '19 February 2029'],
          ],
          scope: 'Welded towbars with fixed ball type A for Lada Vesta, Granta, Largus and Niva, maximum towing mass up to 1500 kg.',
        }),
      ),
      pdf('otkaznoe-pismo-elektrika.pdf', 'Отказное письмо: электрика фаркопа не подлежит обязательной сертификации', () =>
        pdfDocument({
          title: 'Отказное письмо на электрику фаркопа',
          heading: 'Letter of exemption',
          subtitle: 'Wiring kits and trailer sockets',
          demo: true,
          blocks: [
            {
              p: 'The certification body confirms that wiring kits for towbars (universal and vehicle specific), Smart Connect matching modules and trailer sockets 7 pin and 13 pin are not subject to mandatory certification in the Eurasian Economic Union.',
            },
            { fields: [['Products', 'Towbar wiring kits, sockets, adapters'], ['Applicant', 'Farkop Ru LLC'], ['Date', '5 March 2026']] },
            {
              p: 'This letter may be presented to customs, marketplaces and retail partners as a confirmation that no certificate or declaration is required for the listed products.',
            },
          ],
        }),
      ),
      pdf('sertifikat-iso-9001.pdf', 'Сертификат системы менеджмента качества ISO 9001 установочного центра', () =>
        certificatePdf({
          title: 'Сертификат ISO 9001',
          heading: 'Quality management certificate',
          number: 'ISO 9001:2015 DEMO-QMS-2026-117',
          fields: [
            ['Organization', 'Farkop Ru LLC'],
            ['Sites', 'Moscow, Khimki, St. Petersburg'],
            ['Scope', 'Sale and installation of towbars'],
            ['Issued', '1 April 2026'],
            ['Valid until', '31 March 2029'],
          ],
          scope: 'Quality management system for retail sale, installation and warranty service of towbars, wiring kits and car accessories.',
        }),
      ),
      png('Сертификат дилера Thule.png', 'Сертификат официального дилера Thule — скан для страницы «О компании»', () =>
        certificateImage(1200, 850),
      ),
      png('sertifikat-ustanovochnogo-centra.png', 'Свидетельство об аккредитации установочного центра на Варшавском шоссе', () =>
        certificateImage(850, 1200, { seal: '#1565c0', frame: '#8d6e63' }),
      ),
    ],
  },
  {
    code: 'news',
    name: 'Новости',
    files: [
      png('news-new-warehouse.png', 'К новости об открытии склада в Подольске: 4000 фаркопов в наличии', () =>
        newsImage(1280, 720, { scene: 'warehouse', stops: ['#264653', '#2a9d8f'] }),
      ),
      png('news-autumn-sale.png', 'Квадратная обложка новости об осенней скидке 15% на электрику', () =>
        newsImage(1080, 1080, { scene: 'sale', stops: ['#f77f00', '#d62828'], accent: '#e63946' }),
      ),
      png('news-trailer-tips.png', 'Обложка статьи «Как выбрать прицеп для легкового автомобиля» для соцсетей', () =>
        newsImage(1200, 630, { scene: 'trailer', stops: ['#1d3557', '#457b9d'] }),
      ),
      png('news-smart-connect.png', 'К новости о новых блоках согласования Smart Connect', () =>
        newsImage(960, 540, { scene: 'towbar', stops: ['#3a0ca3', '#4361ee'], accent: '#4cc9f0' }),
      ),
      png('news-kazan-service.png', 'Фото к новости об открытии установочного центра в Казани', () =>
        newsImage(1600, 900, { scene: 'service', stops: ['#5f0f40', '#9a031e'], accent: '#fb8b24' }),
      ),
      pdf('press-reliz-kazan.pdf', 'Пресс-релиз об открытии установочного центра в Казани', () =>
        pdfDocument({
          title: 'Пресс-релиз: установочный центр в Казани',
          heading: 'Press release',
          subtitle: 'Farkop.ru opens an installation center in Kazan - 22 September 2026',
          blocks: [
            {
              p: 'Farkop.ru, an online store and installation network for towbars and car accessories, opened its first installation center in Kazan. The center is located at Prospekt Pobedy and has four lifts and a showroom with more than 300 towbar models.',
            },
            {
              p: 'Customers can order a towbar online and have it installed on the same day. The installation of a standard towbar takes about two hours, and the wiring kit is connected and tested while you wait.',
            },
            { h: 'Key facts' },
            {
              list: [
                '4 lifts and 8 certified technicians',
                'Same day installation for orders placed before 12:00',
                'Warehouse stock for Kia, Hyundai, Lada, Toyota and Volkswagen',
                'Opening hours: daily from 9:00 to 21:00',
              ],
            },
            { h: 'Media contact' },
            { fields: [['Press office', 'press@farkop.ru'], ['Phone', '+7 (800) 555-35-35']] },
          ],
        }),
      ),
      txt('grafik-prazdniki.txt', 'Текст новости о графике работы в ноябрьские праздники', HOLIDAY_SCHEDULE),
    ],
  },
];

/** Для отладки без загрузки: собранные файлы раздела по кодам. */
export function buildFiles() {
  return SECTIONS.map((section) => ({
    code: section.code,
    files: section.files.map((file) => ({ name: file.name, type: file.type, data: file.build() })),
  }));
}

/* ----------------------------------------------------------------- Сид -- */

export default async function seed() {
  const sections = await get('/file-sections');
  let createdSections = 0;
  let createdFiles = 0;
  let skippedFiles = 0;

  for (const spec of SECTIONS) {
    const { item: section, created } = await ensure(
      sections,
      (row) => row.code === spec.code,
      () => post('/file-sections', { code: spec.code, name: spec.name }),
    );
    if (created) {
      sections.push(section);
      createdSections += 1;
      log(SECTION, `раздел «${section.name}» (${section.code}) создан`);
    }

    const existing = await get(`/files?sectionId=${section.id}`);
    const names = new Set(existing.map((file) => file.name));

    for (const file of spec.files) {
      if (names.has(file.name)) {
        skippedFiles += 1;
        continue;
      }
      const data = file.build();
      const uploaded = await upload(section.id, { name: file.name, type: file.type, data }, file.description);
      names.add(uploaded.name);
      createdFiles += 1;
      log(SECTION, `${spec.code}/${uploaded.name} — ${(uploaded.size / 1024).toFixed(1)} КБ`);
      if (uploaded.name !== file.name) {
        log(SECTION, `  внимание: имя сохранено как «${uploaded.name}», повторный запуск загрузит файл заново`);
      }
    }
  }

  log(
    SECTION,
    `итого: разделов создано ${createdSections}, файлов загружено ${createdFiles}, уже было ${skippedFiles}`,
  );
  return { created: createdSections + createdFiles };
}
