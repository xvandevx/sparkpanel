import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../redux';
import { loadApiSpecThunk } from '../../redux/action-creaters/externalApi';
import { saveBlobFile } from '../csv';
import { SPEC_FILE_NAME } from './apiFormat';

/**
 * Спецификация внешнего API для вкладки «Документация». Сервер собирает её
 * из настроек списков при каждом запросе — поэтому и здесь она читается
 * при каждом показе вкладки.
 */
export function useApiDocs() {
  const dispatch = useDispatch<AppDispatch>();
  const [spec, setSpec] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCurrent = true;
    dispatch(loadApiSpecThunk())
      .then((loaded) => isCurrent && setSpec(loaded))
      .catch((reason: unknown) =>
        isCurrent && setError(reason instanceof Error ? reason.message : 'Не удалось собрать документацию'),
      );
    return () => {
      isCurrent = false;
    };
  }, [dispatch]);

  /** Спецификация файлом — для генераторов клиентов и Postman. */
  const download = () => {
    if (spec) saveBlobFile(SPEC_FILE_NAME, new Blob([JSON.stringify(spec, null, 2)], { type: 'application/json' }));
  };

  return { spec, isLoading: spec === null && error === null, error, download };
}
