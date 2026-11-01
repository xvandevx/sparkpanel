import { SectionScreen } from '../../../components/files';
import { AdminLayout } from '../../../components/layout';

/** Один раздел файлов: номер раздела в адресе, его читает сам экран. */
export default function AdminFileSectionPage() {
  return (
    <AdminLayout>
      <SectionScreen />
    </AdminLayout>
  );
}
