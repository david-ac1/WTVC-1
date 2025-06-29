import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { adminService } from '../lib/admin';
import { AlertCircle, Loader2 } from 'lucide-react';

interface AdminRouteProps {
  children: React.ReactNode;
  requiredPermission?: string;
}

export const AdminRoute: React.FC<AdminRouteProps> = ({ 
  children, 
  requiredPermission 
}) => {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = React.useState<boolean | null>(null);
  const [hasPermission, setHasPermission] = React.useState<boolean | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Check if user is admin
        const adminStatus = await adminService.isAdmin();
        setIsAdmin(adminStatus);

        // Check specific permission if required
        if (adminStatus && requiredPermission) {
          const permissionStatus = await adminService.hasPermission(requiredPermission);
          setHasPermission(permissionStatus);
        } else {
          setHasPermission(adminStatus);
        }
      } catch (err) {
        console.error('Error checking admin status:', err);
        setError('Failed to verify admin permissions');
        setIsAdmin(false);
        setHasPermission(false);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      checkAdminStatus();
    }
  }, [user, authLoading, requiredPermission]);

  // Show loading state
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">Verifying admin permissions...</p>
        </div>
      </div>
    );
  }

  // Redirect if not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Show access denied if not admin or missing permission
  if (!isAdmin || !hasPermission) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">
            {!isAdmin 
              ? 'You do not have administrator privileges.'
              : `You do not have the required permission: ${requiredPermission}`
            }
          </p>
          <Navigate to="/" replace />
        </div>
      </div>
    );
  }

  // Render admin content
  return <>{children}</>;
};