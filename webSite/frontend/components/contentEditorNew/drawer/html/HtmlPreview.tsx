import { theme } from 'antd';

/**
 * Результат разметки рядом с кодом (режим «Рядом»): как страница покажет
 * этот HTML. Только просмотр — править визуально здесь нельзя: визуальный
 * редактор выбросил бы разметку вне своей схемы прямо во время правки кода.
 *
 * Рисуется во фрейме без прав (`sandbox` пустой): скрипты и обработчики
 * из значения не выполняются, стили панели не мешают разметке, а её — панели.
 * Адрес у фрейма — адрес панели, поэтому картинки `/uploads/…` видны.
 */
export default function HtmlPreview({ html }: { html: string }) {
  const { token } = theme.useToken();
  const page = `<!doctype html><html><head><meta charset="utf-8"><style>
    body { margin: 0; padding: 24px 32px; font: 16px/1.7 ${token.fontFamily}; color: ${token.colorText}; }
    body > * + * { margin-top: 0.8em; }
    p, h1, h2, h3, h4, ul, ol, blockquote, table, pre { margin: 0; }
    img { max-width: 100%; height: auto; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid ${token.colorBorder}; padding: 4px 8px; vertical-align: top; }
    blockquote { padding-left: 12px; border-left: 3px solid ${token.colorBorder}; }
  </style></head><body>${html}</body></html>`;
  return (
    <iframe
      title="Результат"
      sandbox=""
      srcDoc={page}
      style={{ display: 'block', width: '100%', height: '100%', border: 0, background: token.colorBgContainer }}
    />
  );
}
