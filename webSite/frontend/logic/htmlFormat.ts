/**
 * «Отформатировать HTML»: разметку раскладывают по строкам, чтобы её можно было
 * читать. Каждый блочный тег — с новой строки, вложенность — два пробела; теги
 * внутри текста (`b`, `a`, `span`, `img`…) остаются в тексте; блок, в котором
 * только текст, — одной строкой (`<p>…</p>`). Меняются только пробелы
 * и переносы: теги, атрибуты и текст — как были, на сайте выглядит так же.
 * Содержимое `pre`, `textarea`, `script` и `style` не трогается вовсе.
 *
 * Разметку с ошибкой (не закрыт тег, лишний закрывающий) не трогаем: отдаём
 * ошибку с номером строки — пусть человек поправит сам.
 */

/** Теги внутри текста: перенос строки рядом с ними был бы виден на сайте. */
const INLINE = new Set([
  'a', 'abbr', 'b', 'bdi', 'bdo', 'br', 'button', 'cite', 'code', 'data', 'del', 'dfn', 'em',
  'i', 'img', 'input', 'ins', 'kbd', 'label', 'mark', 'q', 's', 'samp', 'select', 'small',
  'span', 'strike', 'strong', 'sub', 'sup', 'time', 'u', 'var', 'wbr',
]);

/** Теги без закрывающего. */
const VOID = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr',
]);

/** Содержимое этих тегов переносится как есть: пробелы в нём значимы. */
const RAW = new Set(['pre', 'textarea', 'script', 'style']);

/** Комментарий, `<!doctype>` или тег (атрибуты в кавычках могут содержать `>`). */
const TOKEN = /<!--[\s\S]*?-->|<![^>]*>|<(\/?)([a-zA-Z][\w:-]*)(?:[^>"']|"[^"]*"|'[^']*')*>/g;

const INDENT = '  ';

type Open = {
  name: string;
  /** Строка исходника, где тег открыт, — для сообщения об ошибке. */
  sourceLine: number;
  isBlock: boolean;
  /** Номер строки результата с открывающим тегом (у блочного). */
  lineIndex: number;
  /** Внутри есть блоки — тогда тег не сворачивается в одну строку. */
  hasBlocks: boolean;
};

export type HtmlFormatResult = { isOk: true; html: string } | { isOk: false; error: string };

export function formatHtml(source: string): HtmlFormatResult {
  if (source.trim() === '') return { isOk: true, html: source };

  const lines: string[] = [];
  const stack: Open[] = [];
  let inline = '';
  let depth = 0;
  let position = 0;

  const lineAt = (index: number) => source.slice(0, index).split('\n').length;
  const indent = () => INDENT.repeat(depth);
  const markBlockInParent = () => {
    const parent = [...stack].reverse().find((open) => open.isBlock);
    if (parent) parent.hasBlocks = true;
  };
  // Набранный текст с тегами внутри него — отдельной строкой
  const flush = () => {
    const text = inline.trim();
    if (text !== '') lines.push(indent() + text);
    inline = '';
  };
  const pushBlockLine = (text: string) => {
    flush();
    markBlockInParent();
    lines.push(indent() + text);
  };
  const addText = (text: string) => {
    inline += text.replace(/\s+/g, ' ');
  };

  TOKEN.lastIndex = 0;
  for (let match = TOKEN.exec(source); match; match = TOKEN.exec(source)) {
    addText(source.slice(position, match.index));
    position = TOKEN.lastIndex;
    const [token, slash, rawName] = match;

    // Комментарий и <!doctype>
    if (rawName === undefined) {
      pushBlockLine(token);
      continue;
    }

    const name = rawName.toLowerCase();
    const isInline = INLINE.has(name);

    if (slash) {
      const open = stack[stack.length - 1];
      if (!open) return { isOk: false, error: `Лишний закрывающий тег </${name}> в строке ${lineAt(match.index)}` };
      if (open.name !== name) return { isOk: false, error: `Не закрыт тег <${open.name}> в строке ${open.sourceLine}` };
      stack.pop();
      if (!open.isBlock) {
        inline += token;
        continue;
      }
      // Внутри только текст — блок одной строкой: <p>…</p>
      const text = inline.trim();
      inline = '';
      depth -= 1;
      if (!open.hasBlocks && lines.length === open.lineIndex + 1) {
        lines[open.lineIndex] += text + token;
      } else {
        if (text !== '') lines.push(indent() + INDENT + text);
        lines.push(indent() + token);
      }
      continue;
    }

    const isSelfClosing = VOID.has(name) || token.endsWith('/>');

    if (RAW.has(name) && !isSelfClosing) {
      const close = new RegExp(`</${name}\\s*>`, 'ig');
      close.lastIndex = position;
      const end = close.exec(source);
      if (!end) return { isOk: false, error: `Не закрыт тег <${name}> в строке ${lineAt(match.index)}` };
      position = close.lastIndex;
      TOKEN.lastIndex = position;
      pushBlockLine(source.slice(match.index, position));
      continue;
    }

    if (isInline) {
      inline += token;
      if (!isSelfClosing) {
        stack.push({ name, sourceLine: lineAt(match.index), isBlock: false, lineIndex: -1, hasBlocks: false });
      }
      continue;
    }

    pushBlockLine(token);
    if (!isSelfClosing) {
      stack.push({ name, sourceLine: lineAt(match.index), isBlock: true, lineIndex: lines.length - 1, hasBlocks: false });
      depth += 1;
    }
  }
  addText(source.slice(position));
  flush();

  const open = stack[stack.length - 1];
  if (open) return { isOk: false, error: `Не закрыт тег <${open.name}> в строке ${open.sourceLine}` };
  return { isOk: true, html: lines.join('\n') };
}
