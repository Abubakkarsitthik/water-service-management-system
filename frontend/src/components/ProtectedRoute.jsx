import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * ProtectedRoute — guards routes that require authentication.
 *
 * Behaviour:
 *  - While auth state is loading (checking localStorage on startup): show spinner
 *  - No authenticated user → redirect to /login
 *  - adminOnly=true and user is not admin → redirect to /dashboard
 *  - Otherwise → render children
 */
export default function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth();

  // Auth state is still being resolved (e.g. reading localStorage) — wait
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
          <p className="text-surface-500 text-sm font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  // Not logged in → send to login page
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Admin-only route but user is not admin → send to dashboard
  if (adminOnly && user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
