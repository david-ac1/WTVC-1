import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, 
  FileText, 
  MessageCircle, 
  Shield, 
  TrendingUp, 
  AlertTriangle,
  Eye,
  Star,
  Pin,
  Activity,
  Calendar,
  BarChart3
} from 'lucide-react';
import { adminService, AdminStats, AdminAction } from '../lib/admin';

export const AdminDashboardPage: React.FC = () => {
  const [stats, setStats] = React.useState<AdminStats | null>(null);
  const [recentActions, setRecentActions] = React.useState<AdminAction[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [statsData, actionsData] = await Promise.all([
          adminService.getAdminStats(),
          adminService.getAdminActions(10, 0)
        ]);

        setStats(statsData);
        setRecentActions(actionsData);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const formatActionType = (actionType: string): string => {
    return actionType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60);
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-gray-100 rounded-lg p-6">
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Dashboard Error</h1>
        <p className="text-gray-600">{error || 'Unable to load dashboard data'}</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-4">
          <Shield className="h-8 w-8 text-blue-500" />
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        </div>
        <p className="text-gray-600">
          Manage users, content, and platform settings
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white border border-gray-300 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalUsers.toLocaleString()}</p>
              {stats.bannedUsers > 0 && (
                <p className="text-xs text-red-600">{stats.bannedUsers} banned</p>
              )}
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-300 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Projects</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalProjects.toLocaleString()}</p>
              {stats.featuredProjects > 0 && (
                <p className="text-xs text-green-600">{stats.featuredProjects} featured</p>
              )}
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <FileText className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-300 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Comments</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalComments.toLocaleString()}</p>
              {stats.hiddenComments > 0 && (
                <p className="text-xs text-red-600">{stats.hiddenComments} hidden</p>
              )}
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <MessageCircle className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-300 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Recent Actions</p>
              <p className="text-3xl font-bold text-gray-900">{stats.recentActions}</p>
              <p className="text-xs text-gray-500">Last 24 hours</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <Activity className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Link
          to="/admin/users"
          className="bg-white border border-gray-300 rounded-lg p-6 hover:border-blue-300 hover:shadow-md transition-all group"
        >
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Manage Users</h3>
              <p className="text-sm text-gray-600">View, ban, and assign roles to users</p>
            </div>
          </div>
        </Link>

        <Link
          to="/admin/projects"
          className="bg-white border border-gray-300 rounded-lg p-6 hover:border-green-300 hover:shadow-md transition-all group"
        >
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
              <FileText className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Manage Projects</h3>
              <p className="text-sm text-gray-600">Feature, pin, and moderate projects</p>
            </div>
          </div>
        </Link>

        <Link
          to="/admin/comments"
          className="bg-white border border-gray-300 rounded-lg p-6 hover:border-purple-300 hover:shadow-md transition-all group"
        >
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
              <MessageCircle className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Manage Comments</h3>
              <p className="text-sm text-gray-600">Hide inappropriate comments</p>
            </div>
          </div>
        </Link>

        <Link
          to="/admin/roles"
          className="bg-white border border-gray-300 rounded-lg p-6 hover:border-orange-300 hover:shadow-md transition-all group"
        >
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-orange-100 rounded-lg group-hover:bg-orange-200 transition-colors">
              <Shield className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Manage Roles</h3>
              <p className="text-sm text-gray-600">Assign admin roles and permissions</p>
            </div>
          </div>
        </Link>

        <Link
          to="/admin/analytics"
          className="bg-white border border-gray-300 rounded-lg p-6 hover:border-indigo-300 hover:shadow-md transition-all group"
        >
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-indigo-100 rounded-lg group-hover:bg-indigo-200 transition-colors">
              <BarChart3 className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Analytics</h3>
              <p className="text-sm text-gray-600">View detailed platform analytics</p>
            </div>
          </div>
        </Link>

        <Link
          to="/admin/actions"
          className="bg-white border border-gray-300 rounded-lg p-6 hover:border-red-300 hover:shadow-md transition-all group"
        >
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-red-100 rounded-lg group-hover:bg-red-200 transition-colors">
              <Activity className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Action Log</h3>
              <p className="text-sm text-gray-600">View all admin actions and changes</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Recent Actions */}
      <div className="bg-white border border-gray-300 rounded-lg">
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Recent Admin Actions</h3>
            <Link
              to="/admin/actions"
              className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
            >
              View All
            </Link>
          </div>
        </div>
        
        <div className="p-6">
          {recentActions.length > 0 ? (
            <div className="space-y-4">
              {recentActions.map((action) => (
                <div key={action.id} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                      {action.admin.username.charAt(0).toUpperCase()}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-900">
                        {action.admin.username}
                      </span>
                      <span className="text-sm text-gray-600">
                        {formatActionType(action.action_type)}
                      </span>
                      <span className="text-sm text-gray-500">
                        {action.target_type}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 mt-1">
                      <Calendar className="h-3 w-3 text-gray-400" />
                      <span className="text-xs text-gray-500">
                        {formatDate(action.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Activity className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">No recent admin actions</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};