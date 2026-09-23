import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-orange-500">
        Loading...
      </div>
    );
  }
  if (!user) return <Navigate to="/admin/login" replace />;
  return children;
}
