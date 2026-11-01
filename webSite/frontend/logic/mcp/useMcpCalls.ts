import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../redux';
import { loadMcpCallsThunk, type McpCall } from '../../redux/action-creaters/mcp';
import type { McpCallsView } from './mcpFormat';

export interface McpCallsFilter {
  /** Только вызовы этого токена; null — всех */
  tokenId: number | null;
  /** Только этот инструмент; null — все */
  tool: string | null;
  view: McpCallsView;
}

const FIRST_PAGE = { page: 1, pageSize: 20 };

/**
 * Журнал вызовов MCP для вкладки «Журнал»: отбор по токену, инструменту
 * и виду, страница с сервера. Сменили отбор — снова первая страница.
 */
export function useMcpCalls() {
  const dispatch = useDispatch<AppDispatch>();
  const [filter, setFilter] = useState<McpCallsFilter>({ tokenId: null, tool: null, view: 'all' });
  const [paging, setPaging] = useState(FIRST_PAGE);
  const [calls, setCalls] = useState<McpCall[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCurrent = true;
    setIsLoading(true);
    dispatch(
      loadMcpCallsThunk({
        tokenId: filter.tokenId ?? undefined,
        tool: filter.tool ?? undefined,
        view: filter.view,
        ...paging,
      }),
    )
      .then((page) => {
        if (!isCurrent) return;
        setCalls(page.items);
        setTotal(page.total);
        setError(null);
      })
      .catch((reason: unknown) => {
        if (isCurrent) setError(reason instanceof Error ? reason.message : 'Не удалось загрузить журнал');
      })
      .finally(() => isCurrent && setIsLoading(false));
    return () => {
      isCurrent = false;
    };
  }, [dispatch, filter, paging]);

  const changeFilter = (patch: Partial<McpCallsFilter>) => {
    setFilter((prev) => ({ ...prev, ...patch }));
    setPaging((prev) => ({ ...prev, page: 1 }));
  };

  const changePage = (page: number, pageSize: number) => setPaging({ page, pageSize });

  return { calls, total, ...paging, filter, isLoading, error, changeFilter, changePage };
}
