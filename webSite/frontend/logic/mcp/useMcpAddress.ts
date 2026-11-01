import { useEffect, useState } from 'react';
import { mcpUrl } from './mcpFormat';

/**
 * Адрес MCP-сервера на этом сайте. Origin известен только в браузере, а
 * страницы рендерятся и на сервере: до монтирования адрес — от корня,
 * иначе разметка разошлась бы с серверной.
 */
export function useMcpAddress(): string {
  const [origin, setOrigin] = useState('');
  useEffect(() => setOrigin(window.location.origin), []);
  return mcpUrl(origin);
}
