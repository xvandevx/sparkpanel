import { ContentEditor } from '../contentEditorNew';
import { useLoadPages } from '../../logic/pages';
import { usePagesNewController } from '../../logic/pagesNew';

/** Раздел «Страницы» на новом редакторе контента: пока только таблица. */
export default function PagesNewScreen() {
  useLoadPages();

  const controller = usePagesNewController();

  return <ContentEditor controller={controller} />;
}
