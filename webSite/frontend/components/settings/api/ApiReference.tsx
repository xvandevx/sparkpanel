import { ApiReferenceReact } from '@scalar/api-reference-react';
// Обёртка своих стилей не подключает — без них справочник приходит голым HTML
import '@scalar/api-reference-react/style.css';

/**
 * Справочник API от Scalar поверх готовой спецификации. Отдельным файлом —
 * чтобы грузить его только в браузере (`next/dynamic`): Scalar при импорте
 * обращается к `window`. Тема светлая, как у панели; скачивание спецификации —
 * своей кнопкой над справочником.
 */
export default function ApiReference({ spec }: { spec: Record<string, unknown> }) {
  return (
    // Своя прокрутка: в общей прокрутке страницы меню справочника уезжало
    // вверх вместе с шапкой раздела
    <div className="overflow-auto rounded-lg" style={{ height: 'calc(100vh - 260px)', minHeight: 560 }}>
      <ApiReferenceReact
        configuration={{
          content: spec,
          forceDarkModeState: 'light',
          hideDarkModeToggle: true,
          withDefaultFonts: false,
          hideClientButton: true,
          documentDownloadType: 'none',
          // На localhost Scalar показывает свою панель разработчика — панели она не нужна
          showToolbar: 'never',
          // Чат с ИИ ходит в облако Scalar — спецификацию сайта туда не отдаём
          agent: { disabled: true },
          mcp: { disabled: true },
          defaultHttpClient: { targetKey: 'shell', clientKey: 'curl' },
        }}
      />
    </div>
  );
}
