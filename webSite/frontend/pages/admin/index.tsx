import { DashboardScreen } from '../../components/dashboard';
import { AdminLayout } from '../../components/layout';

/** Страница — только композиция. Данные и логика живут в компонентах и хуках logic/. */
export default function AdminHomePage() {
  return (
    <AdminLayout>
      <DashboardScreen />
    </AdminLayout>
  );
}
