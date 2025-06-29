import React from 'react';
import { Link } from 'react-router-dom';
import { Bell, X, Check, CheckCheck, Trash2, MessageCircle, ArrowUp, ArrowDown, User } from 'lucide-react';
import { notificationService, Notification } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useNotificationCount } from '../hooks/useNotificationCount';

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { unreadCount } = useNotificationCount();
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Fetch notifications when panel opens or when unread count changes
  React.useEffect(() => {
    if (isOpen && user) {
      fetchNotifications();
    }
  }, [isOpen, user, unreadCount]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await notificationService.getNotifications(20, 0);
      setNotifications(data);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationIds: string[]) => {
    try {
      await notificationService.markAsRead(notificationIds);
      setNotifications(prev => 
        prev.map(notification => 
          notificationIds.includes(notification.id) 
            ? { ...notification, is_read: true }
            : notification
        )
      );
    } catch (err) {
      console.error('Error marking notifications as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, is_read: true }))
      );
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    try {
      await notificationService.deleteNotification(notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'project_upvote':
        return <ArrowUp className="h-4 w-4 text-green-500" />;
      case 'project_downvote':
        return <ArrowDown className="h-4 w-4 text-red-500" />;
      case 'project_comment':
      case 'comment_reply':
        return <MessageCircle className="h-4 w-4 text-blue-500" />;
      case 'comment_upvote':
        return <ArrowUp className="h-4 w-4 text-green-500" />;
      case 'comment_downvote':
        return <ArrowDown className="h-4 w-4 text-red-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatTimeAgo = (dateString: string) => {
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

  // Handle clicks within the panel to prevent closing
  const handlePanelClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="absolute right-0 mt-2 w-96 glass-effect border border-white/20 rounded-xl shadow-xl z-50 max-h-96 overflow-hidden"
      onClick={handlePanelClick}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200/50">
        <h3 className="text-lg font-bold text-gray-900">Notifications</h3>
        <div className="flex items-center space-x-3">
          {notifications.some(n => !n.is_read) && (
            <button
              onClick={handleMarkAllAsRead}
              className="flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-800 transition-colors font-medium"
              title="Mark all as read"
            >
              <CheckCheck className="h-3 w-3" />
              <span>Mark all read</span>
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-h-80 overflow-y-auto">
        {loading ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto mb-3"></div>
            <p className="text-sm text-gray-500 font-medium">Loading notifications...</p>
          </div>
        ) : error ? (
          <div className="p-6 text-center">
            <p className="text-sm text-red-600 mb-3">{error}</p>
            <button
              onClick={fetchNotifications}
              className="button-primary text-xs"
            >
              Try again
            </button>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center">
            <div className="p-4 bg-gray-100 rounded-xl w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Bell className="h-8 w-8 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500 font-medium">No notifications yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`relative p-4 hover:bg-gray-50/60 transition-colors ${
                  !notification.is_read ? 'bg-blue-50/60' : ''
                }`}
              >
                {/* Unread indicator */}
                {!notification.is_read && (
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 w-2 h-2 bg-blue-500 rounded-full"></div>
                )}
                
                <div className="flex items-start space-x-3 ml-4">
                  {/* Icon */}
                  <div className="flex-shrink-0 mt-1 p-2 bg-white rounded-lg shadow-sm">
                    {getNotificationIcon(notification.type)}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <Link
                      to={notification.link}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!notification.is_read) {
                          handleMarkAsRead([notification.id]);
                        }
                        onClose();
                      }}
                      className="block"
                    >
                      <p className={`text-sm leading-relaxed ${
                        !notification.is_read ? 'font-semibold text-gray-900' : 'text-gray-700'
                      }`}>
                        {notification.message}
                      </p>
                      <div className="flex items-center space-x-2 mt-2">
                        <span className="text-xs text-gray-500 font-medium">
                          {formatTimeAgo(notification.created_at)}
                        </span>
                        {notification.sender_username && (
                          <>
                            <span className="text-xs text-gray-400">•</span>
                            <span className="text-xs text-gray-500">
                              by {notification.sender_username}
                            </span>
                          </>
                        )}
                      </div>
                    </Link>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center space-x-1">
                    {!notification.is_read && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkAsRead([notification.id]);
                        }}
                        className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg transition-colors"
                        title="Mark as read"
                      >
                        <Check className="h-3 w-3" />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteNotification(notification.id);
                      }}
                      className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg transition-colors"
                      title="Delete notification"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="border-t border-gray-200/50 p-4 text-center">
          <Link
            to="/notifications"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="text-sm text-blue-600 hover:text-blue-800 transition-colors font-medium"
          >
            View all notifications
          </Link>
        </div>
      )}
    </div>
  );
};