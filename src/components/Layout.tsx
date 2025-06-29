import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Plus, User, TrendingUp, Search, BarChart3, LogOut, X, Bell, Shield, Menu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { statsService } from '../lib/supabase';
import { adminService } from '../lib/admin';
import { CommunityStats, PopularAiTool } from '../types';
import { NotificationPanel } from './NotificationPanel';
import { useNotificationCount } from '../hooks/useNotificationCount';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut, loading } = useAuth();
  const [showUserMenu, setShowUserMenu] = React.useState(false);
  const [showNotificationPanel, setShowNotificationPanel] = React.useState(false);
  const [showMobileMenu, setShowMobileMenu] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isSearchFocused, setIsSearchFocused] = React.useState(false);
  const [isAdmin, setIsAdmin] = React.useState(false);
  
  // Sidebar data state
  const [communityStats, setCommunityStats] = React.useState<CommunityStats | null>(null);
  const [popularAiTools, setPopularAiTools] = React.useState<PopularAiTool[]>([]);
  const [sidebarLoading, setSidebarLoading] = React.useState(true);

  // Avatar display state
  const [avatarError, setAvatarError] = React.useState(false);

  // Notification count hook
  const { unreadCount, refreshCount } = useNotificationCount();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const handleSignOut = async () => {
    await signOut();
    setShowUserMenu(false);
    setShowMobileMenu(false);
  };

  const getUserDisplayName = () => {
    if (!user) return '';
    return user.user_metadata?.username || user.email?.split('@')[0] || 'User';
  };

  const getUserAvatarUrl = () => {
    if (!user) return null;
    const avatarUrl = user.user_metadata?.avatar_url || null;
    return avatarUrl;
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setShowMobileMenu(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  const handleAvatarError = () => {
    setAvatarError(true);
  };

  const handleNotificationClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowNotificationPanel(!showNotificationPanel);
    if (!showNotificationPanel) {
      refreshCount();
    }
  };

  const handleUserMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowUserMenu(!showUserMenu);
  };

  const closeMobileMenu = () => {
    setShowMobileMenu(false);
  };

  // Reset avatar error when user changes
  React.useEffect(() => {
    setAvatarError(false);
  }, [user?.id]);

  // Check admin status
  React.useEffect(() => {
    const checkAdminStatus = async () => {
      if (user) {
        try {
          const adminStatus = await adminService.isAdmin();
          setIsAdmin(adminStatus);
        } catch (error) {
          console.error('Error checking admin status:', error);
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
    };

    checkAdminStatus();
  }, [user]);

  // Update search query from URL when on search page
  React.useEffect(() => {
    if (location.pathname === '/search') {
      const urlParams = new URLSearchParams(location.search);
      const query = urlParams.get('q') || '';
      setSearchQuery(query);
    }
  }, [location]);

  // Fetch sidebar data
  React.useEffect(() => {
    const fetchSidebarData = async () => {
      try {
        setSidebarLoading(true);
        
        const [stats, tools] = await Promise.all([
          statsService.getCommunityStats(),
          statsService.getPopularAiTools()
        ]);
        
        setCommunityStats(stats);
        setPopularAiTools(tools);
      } catch (error) {
        console.error('Error fetching sidebar data:', error);
        setCommunityStats({
          totalProjects: 0,
          aiAssistedProjects: 0,
          verifiedProjects: 0,
          activeDevelopers: 0
        });
        setPopularAiTools([]);
      } finally {
        setSidebarLoading(false);
      }
    };

    fetchSidebarData();
  }, []);

  // Close menus when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Element;
      
      if (target.closest('[data-notification-trigger]') || 
          target.closest('[data-user-menu-trigger]') ||
          target.closest('[data-notification-panel]') ||
          target.closest('[data-user-menu]') ||
          target.closest('[data-mobile-menu]')) {
        return;
      }
      
      setShowUserMenu(false);
      setShowNotificationPanel(false);
      setShowMobileMenu(false);
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Close mobile menu on route change
  React.useEffect(() => {
    setShowMobileMenu(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {/* Header */}
      <header className="glass-effect sticky top-0 z-50 border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-3 flex-shrink-0 group">
              <div className="w-10 h-10 p-1.5 border-2 border-blue-600 rounded-xl flex items-center justify-center bg-white shadow-lg hover:shadow-xl transition-all duration-300 group-hover:scale-105">
                <img 
                  src="/logo.png" 
                  alt="Was This Vibe Coded Logo" 
                  className="w-full h-full object-contain filter contrast-125 brightness-110"
                />
              </div>
              <div className="hidden sm:block">
                <span className="font-bold text-gray-900 text-lg">Was This</span>
                <span className="font-bold text-blue-600 text-lg ml-1">Vibe</span>
                <span className="font-bold text-gray-900 text-lg ml-1">Coded?</span>
              </div>
            </Link>

            {/* Desktop Search Bar */}
            <div className="hidden lg:flex flex-1 max-w-2xl mx-6">
              <form onSubmit={handleSearchSubmit} className="relative w-full">
                <div className={`relative transition-all duration-300 ${
                  isSearchFocused ? 'ring-2 ring-blue-500 shadow-lg' : 'shadow-md'
                }`}>
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => setIsSearchFocused(false)}
                    placeholder="Search projects, technologies, AI tools..."
                    className="w-full pl-12 pr-12 py-3 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all duration-300"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={clearSearch}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                
                {/* Search suggestions/hints */}
                {isSearchFocused && !searchQuery && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-xl shadow-xl p-4 z-50">
                    <div className="text-xs text-gray-500 mb-3 font-medium">Try searching for:</div>
                    <div className="flex flex-wrap gap-2">
                      {['React', 'AI-assisted', 'GitHub Copilot', 'TypeScript', 'Next.js', 'ChatGPT'].map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => {
                            setSearchQuery(suggestion);
                            navigate(`/search?q=${encodeURIComponent(suggestion)}`);
                          }}
                          className="px-3 py-1.5 bg-gray-100 hover:bg-blue-100 text-sm text-gray-700 hover:text-blue-700 rounded-lg transition-all duration-200 font-medium"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </form>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-2 lg:space-x-4">
              <Link
                to="/analytics"
                className={`flex items-center space-x-2 text-sm font-medium transition-all duration-200 px-3 py-2 rounded-xl ${
                  isActive('/analytics') 
                    ? 'text-blue-600 bg-blue-100 shadow-md' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                }`}
              >
                <BarChart3 className="h-4 w-4" />
                <span className="hidden lg:inline">Analytics</span>
              </Link>
              <Link
                to="/trending"
                className={`flex items-center space-x-2 text-sm font-medium transition-all duration-200 px-3 py-2 rounded-xl ${
                  isActive('/trending') 
                    ? 'text-blue-600 bg-blue-100 shadow-md' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                }`}
              >
                <TrendingUp className="h-4 w-4" />
                <span className="hidden lg:inline">Trending</span>
              </Link>
              {isAdmin && (
                <Link
                  to="/admin"
                  className={`flex items-center space-x-2 text-sm font-medium transition-all duration-200 px-3 py-2 rounded-xl ${
                    location.pathname.startsWith('/admin') 
                      ? 'text-blue-600 bg-blue-100 shadow-md' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                  }`}
                >
                  <Shield className="h-4 w-4" />
                  <span className="hidden lg:inline">Admin</span>
                </Link>
              )}
            </nav>

            {/* User Actions */}
            <div className="flex items-center space-x-3 lg:space-x-4">
              {user && (
                <>
                  {/* Submit Project Button - Hidden on small screens */}
                  <Link
                    to="/submit"
                    className="hidden sm:flex items-center px-4 lg:px-6 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-sm font-semibold rounded-xl transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105"
                  >
                    <Plus className="h-4 w-4 lg:mr-2" />
                    <span className="hidden lg:inline">Submit Project</span>
                  </Link>

                  {/* Notification Bell */}
                  <div className="relative">
                    <button
                      onClick={handleNotificationClick}
                      data-notification-trigger
                      className="relative p-2.5 text-gray-600 hover:text-gray-900 hover:bg-white/60 rounded-xl transition-all duration-200"
                    >
                      <Bell className="h-5 w-5" />
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-semibold shadow-md">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      )}
                    </button>
                    
                    <div data-notification-panel>
                      <NotificationPanel
                        isOpen={showNotificationPanel}
                        onClose={() => setShowNotificationPanel(false)}
                      />
                    </div>
                  </div>
                </>
              )}
              
              {loading ? (
                <div className="w-10 h-10 bg-gray-200 rounded-xl animate-pulse"></div>
              ) : user ? (
                <div className="relative">
                  <button
                    onClick={handleUserMenuClick}
                    data-user-menu-trigger
                    className="flex items-center space-x-3 p-2 text-gray-600 hover:text-gray-900 hover:bg-white/60 rounded-xl transition-all duration-200"
                  >
                    {/* User Avatar or Fallback */}
                    <div className="relative">
                      {getUserAvatarUrl() && !avatarError ? (
                        <img
                          src={getUserAvatarUrl()!}
                          alt={`${getUserDisplayName()}'s avatar`}
                          className="w-8 h-8 rounded-xl object-cover border-2 border-gray-200 shadow-sm"
                          onError={handleAvatarError}
                        />
                      ) : (
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white text-sm font-semibold shadow-sm">
                          {getUserDisplayName().charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <span className="hidden lg:block text-sm font-semibold">
                      {getUserDisplayName()}
                    </span>
                  </button>
                  
                  {showUserMenu && (
                    <div 
                      data-user-menu
                      className="absolute right-0 mt-2 w-56 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-xl shadow-xl py-2 z-50"
                    >
                      <Link
                        to={`/profile/${getUserDisplayName()}`}
                        className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-100/60 transition-colors"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <User className="h-4 w-4 mr-3" />
                        Profile
                      </Link>
                      {isAdmin && (
                        <Link
                          to="/admin"
                          className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-100/60 transition-colors"
                          onClick={() => setShowUserMenu(false)}
                        >
                          <Shield className="h-4 w-4 mr-3" />
                          Admin Dashboard
                        </Link>
                      )}
                      <button
                        onClick={handleSignOut}
                        className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-100/60 transition-colors"
                      >
                        <LogOut className="h-4 w-4 mr-3" />
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  to="/login"
                  className="p-2.5 text-gray-600 hover:text-gray-900 hover:bg-white/60 rounded-xl transition-all duration-200"
                >
                  <User className="h-5 w-5" />
                </Link>
              )}

              {/* Mobile Menu Button */}
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="md:hidden p-2.5 text-gray-600 hover:text-gray-900 hover:bg-white/60 rounded-xl transition-all duration-200"
                data-mobile-menu
              >
                {showMobileMenu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {showMobileMenu && (
            <div className="md:hidden border-t border-gray-200/50 py-4" data-mobile-menu>
              {/* Mobile Search */}
              <div className="lg:hidden mb-4">
                <form onSubmit={handleSearchSubmit} className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    placeholder="Search projects, technologies, AI tools..."
                    className="w-full pl-12 pr-12 py-3 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all duration-300"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={clearSearch}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </form>
              </div>

              {/* Mobile Navigation Links */}
              <div className="space-y-2">
                <Link
                  to="/analytics"
                  className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive('/analytics') 
                      ? 'text-blue-600 bg-blue-100' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                  }`}
                  onClick={closeMobileMenu}
                >
                  <BarChart3 className="h-5 w-5" />
                  <span>Analytics</span>
                </Link>
                <Link
                  to="/trending"
                  className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive('/trending') 
                      ? 'text-blue-600 bg-blue-100' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                  }`}
                  onClick={closeMobileMenu}
                >
                  <TrendingUp className="h-5 w-5" />
                  <span>Trending</span>
                </Link>
                {isAdmin && (
                  <Link
                    to="/admin"
                    className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                      location.pathname.startsWith('/admin') 
                        ? 'text-blue-600 bg-blue-100' 
                        : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                    }`}
                    onClick={closeMobileMenu}
                  >
                    <Shield className="h-5 w-5" />
                    <span>Admin Dashboard</span>
                  </Link>
                )}
                
                {user && (
                  <>
                    <div className="border-t border-gray-200/50 my-3"></div>
                    <Link
                      to="/submit"
                      className="flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 transition-all duration-200"
                      onClick={closeMobileMenu}
                    >
                      <Plus className="h-5 w-5" />
                      <span>Submit Project</span>
                    </Link>
                    <Link
                      to={`/profile/${getUserDisplayName()}`}
                      className="flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-white/60 transition-all duration-200"
                      onClick={closeMobileMenu}
                    >
                      <User className="h-5 w-5" />
                      <span>Profile</span>
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-white/60 transition-all duration-200 w-full text-left"
                    >
                      <LogOut className="h-5 w-5" />
                      <span>Sign Out</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Sidebar */}
          <aside className="w-80 hidden lg:block">
            {/* Community Stats */}
            <div className="glass-effect rounded-xl p-6 mb-6 shadow-md">
              <h3 className="font-bold text-gray-900 mb-4 text-lg">Community Stats</h3>
              {sidebarLoading ? (
                <div className="space-y-4 animate-pulse">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex justify-between">
                      <div className="h-4 bg-gray-200 rounded w-24"></div>
                      <div className="h-4 bg-gray-200 rounded w-12"></div>
                    </div>
                  ))}
                </div>
              ) : communityStats ? (
                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 font-medium">Total Projects</span>
                    <span className="font-bold text-gray-900">{communityStats.totalProjects.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 font-medium">AI-Assisted</span>
                    <span className="font-bold text-blue-600">
                      {communityStats.aiAssistedProjects.toLocaleString()} 
                      {communityStats.totalProjects > 0 && (
                        <span className="text-xs ml-1 text-gray-500">
                          ({Math.round((communityStats.aiAssistedProjects / communityStats.totalProjects) * 100)}%)
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 font-medium">Verified Projects</span>
                    <span className="font-bold text-green-600">{communityStats.verifiedProjects.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 font-medium">Active Developers</span>
                    <span className="font-bold text-gray-900">{communityStats.activeDevelopers.toLocaleString()}</span>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-500">Unable to load stats</div>
              )}
            </div>

            {/* Popular AI Tools */}
            <div className="glass-effect rounded-xl p-6 mb-6 shadow-md">
              <h4 className="font-bold text-gray-900 mb-4 text-lg">Popular AI Tools</h4>
              {sidebarLoading ? (
                <div className="space-y-3 animate-pulse">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex justify-between">
                      <div className="h-4 bg-gray-200 rounded w-20"></div>
                      <div className="h-4 bg-gray-200 rounded w-8"></div>
                    </div>
                  ))}
                </div>
              ) : popularAiTools.length > 0 ? (
                <div className="space-y-3">
                  {popularAiTools.map((tool) => (
                    <div key={tool.name} className="flex justify-between text-sm">
                      <span className="text-gray-600 truncate font-medium">{tool.name}</span>
                      <span className="font-bold text-gray-900">{tool.count > 0 ? tool.percentage : 0}%</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500">No AI tools data yet</div>
              )}
            </div>

            {/* Community Guidelines */}
            <div className="glass-effect rounded-xl p-6 shadow-md">
              <h4 className="font-bold text-gray-900 mb-4 text-lg">Community Guidelines</h4>
              <ul className="space-y-3 text-sm text-gray-600">
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  <span>Be honest about AI tool usage</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  <span>Share prompts and learnings</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  <span>Respect all development approaches</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  <span>Provide constructive feedback</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  <span>Verify claims when possible</span>
                </li>
              </ul>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};