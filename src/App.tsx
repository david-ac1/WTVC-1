import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { SplashScreen } from './components/SplashScreen';
import { HomePage } from './pages/HomePage';
import { SubmitPage } from './pages/SubmitPage';
import { ProjectDetailPage } from './pages/ProjectDetailPage';
import { LoginPage } from './pages/LoginPage';
import { ProfilePage } from './pages/ProfilePage';
import { EditProfilePage } from './pages/EditProfilePage';
import { AboutPage } from './pages/AboutPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { TrendingPage } from './pages/TrendingPage';
import { SearchPage } from './pages/SearchPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AdminUsersPage } from './pages/AdminUsersPage';
import { AdminProjectsPage } from './pages/AdminProjectsPage';
import { AdminRoute } from './components/AdminRoute';
import { useAuth } from './context/AuthContext';
import { NotificationSystem } from './components/NotificationSystem';
import { useNotifications } from './hooks/useNotifications';
import { useNotificationCount } from './hooks/useNotificationCount';
import { useSplashScreen } from './hooks/useSplashScreen';

// Create a context for notifications
export const NotificationContext = React.createContext<{
  showSuccess: (title: string, message: string, duration?: number) => string;
  showError: (title: string, message: string, duration?: number) => string;
  showInfo: (title: string, message: string, duration?: number) => string;
  refreshNotificationCount: () => void;
} | null>(null);

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Public Route Component (redirects to home if authenticated)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

function App() {
  const { notifications, removeNotification, showSuccess, showError, showInfo } = useNotifications();
  const { refreshCount } = useNotificationCount();
  const { isVisible: showSplash, hideSplash } = useSplashScreen({
    minDisplayTime: 2500,
    autoHide: false
  });

  return (
    <>
      {/* Splash Screen */}
      <SplashScreen 
        isVisible={showSplash} 
        onComplete={hideSplash}
      />

      {/* Main Application */}
      <div className={`transition-opacity duration-500 ${showSplash ? 'opacity-0' : 'opacity-100'}`}>
        <NotificationContext.Provider value={{ 
          showSuccess, 
          showError, 
          showInfo, 
          refreshNotificationCount: refreshCount 
        }}>
          <Router>
            <Routes>
              <Route 
                path="/login" 
                element={
                  <PublicRoute>
                    <LoginPage />
                  </PublicRoute>
                } 
              />
              
              {/* Admin Routes */}
              <Route path="/admin/*" element={
                <AdminRoute>
                  <Layout>
                    <Routes>
                      <Route path="/" element={<AdminDashboardPage />} />
                      <Route path="/users" element={
                        <AdminRoute requiredPermission="manage_users">
                          <AdminUsersPage />
                        </AdminRoute>
                      } />
                      <Route path="/projects" element={
                        <AdminRoute requiredPermission="manage_projects">
                          <AdminProjectsPage />
                        </AdminRoute>
                      } />
                      {/* Add more admin routes as needed */}
                    </Routes>
                  </Layout>
                </AdminRoute>
              } />
              
              {/* Regular Routes */}
              <Route path="/*" element={
                <Layout>
                  <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/about" element={<AboutPage />} />
                    <Route path="/analytics" element={<AnalyticsPage />} />
                    <Route path="/trending" element={<TrendingPage />} />
                    <Route path="/search" element={<SearchPage />} />
                    <Route 
                      path="/submit" 
                      element={
                        <ProtectedRoute>
                          <SubmitPage />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/project/:id" 
                      element={
                        <ProtectedRoute>
                          <ProjectDetailPage />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/profile/:username" 
                      element={
                        <ProtectedRoute>
                          <ProfilePage />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/profile/:username/edit" 
                      element={
                        <ProtectedRoute>
                          <EditProfilePage />
                        </ProtectedRoute>
                      } 
                    />
                  </Routes>
                </Layout>
              } />
            </Routes>
            
            {/* Global Notification System */}
            <NotificationSystem 
              notifications={notifications}
              onRemove={removeNotification}
            />
          </Router>
        </NotificationContext.Provider>
      </div>
    </>
  );
}

export default App;