import { ContentItemsScreen } from '../../../components/contents';
import { AdminLayout } from '../../../components/layout';

/** Элементы одного типа контента: номер типа в адресе, его читает сам экран. */
export default function AdminContentItemsPage() {
  return (
    <AdminLayout>
      <ContentItemsScreen />
    </AdminLayout>
  );
}
