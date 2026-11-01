import { useEffect, useState } from 'react';
import { apiBaseUrl, specUrl, typesCommand } from './apiFormat';

/**
 * Адреса внешнего API на этом сайте. Origin известен только в браузере, а
 * страницы рендерятся и на сервере: до монтирования адреса — от корня,
 * иначе разметка разошлась бы с серверной.
 */
export function useApiAddress() {
  const [origin, setOrigin] = useState('');
  useEffect(() => setOrigin(window.location.origin), []);
  return { baseUrl: apiBaseUrl(origin), specUrl: specUrl(origin), typesCommand: typesCommand(origin) };
}
