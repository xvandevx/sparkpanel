import { useCallback, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../redux';
import {
  createApiKeyThunk,
  loadApiKeysThunk,
  removeApiKeyThunk,
  type ApiKey,
} from '../../redux/action-creaters/externalApi';

/**
 * Ключи внешнего API глазами вкладки «Доступ»: список, создать, отозвать.
 * Читаются при открытии и после каждой своей правки. Действия бросают ошибку
 * текстом — сообщение показывает тот, кто нажимал.
 */
export function useApiKeys() {
  const dispatch = useDispatch<AppDispatch>();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setIsLoading(true);
    try {
      setKeys(await dispatch(loadApiKeysThunk()));
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось загрузить ключи');
    } finally {
      setIsLoading(false);
    }
  }, [dispatch]);

  useEffect(() => {
    void reload();
  }, [reload]);

  /** Создать ключ; ответ — ключ целиком, больше его не покажут. */
  const create = async (name: string): Promise<string> => {
    const { secret } = await dispatch(createApiKeyThunk(name));
    await reload();
    return secret;
  };

  const revoke = async (key: ApiKey): Promise<void> => {
    await dispatch(removeApiKeyThunk(key.id));
    await reload();
  };

  return { keys, isLoading, error, create, revoke };
}
