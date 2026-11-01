import { useCallback, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../redux';
import {
  createMcpTokenThunk,
  loadMcpTokensThunk,
  removeMcpTokenThunk,
  type McpToken,
} from '../../redux/action-creaters/mcp';

/**
 * Токены MCP глазами вкладки «Токены»: список (у root — все, у остальных —
 * свои), создать, отозвать. Читаются при открытии и после каждой своей
 * правки. Действия бросают ошибку текстом — сообщение показывает тот, кто нажимал.
 */
export function useMcpTokens() {
  const dispatch = useDispatch<AppDispatch>();
  const [tokens, setTokens] = useState<McpToken[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setIsLoading(true);
    try {
      setTokens(await dispatch(loadMcpTokensThunk()));
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось загрузить токены');
    } finally {
      setIsLoading(false);
    }
  }, [dispatch]);

  useEffect(() => {
    void reload();
  }, [reload]);

  /** Создать токен; ответ — токен целиком, больше его не покажут. */
  const create = async (name: string, days: number | null): Promise<string> => {
    const { secret } = await dispatch(createMcpTokenThunk(name, days));
    await reload();
    return secret;
  };

  const revoke = async (token: McpToken): Promise<void> => {
    await dispatch(removeMcpTokenThunk(token.id));
    await reload();
  };

  return { tokens, isLoading, error, create, revoke };
}
