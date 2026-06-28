import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import type { UserRole } from '@/types';

interface Props {
  children: React.ReactNode;
  roles?: UserRole[];
}

export function ProtectedRoute({ children, roles }: Props) {
  const { user, token } = useAuthStore();

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    // Redirect to the appropriate default page based on role
    if (user.role === 'peserta' || user.role === 'worker') {
      return <Navigate to="/peta" replace />;
    }
    return <Navigate to="/kelompok" replace />;
  }

  return <>{children}</>;
}
