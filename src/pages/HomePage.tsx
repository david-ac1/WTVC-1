import React from 'react';
import { ProjectCard } from '../components/ProjectCard';
import { projectService } from '../lib/supabase';
import { Project, SortType, FilterType } from '../types';
import { TrendingUp, Clock, Bot, Filter, Zap, AlertCircle, Loader2, Sparkles, Users, Code, Target } from 'lucide-react';

export const HomePage: React.FC = () => {
  const [sortBy, setSortBy] = React.useState<SortType>('trending');
  const [filterBy, setFilterBy] = React.useState<FilterType>('all');
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [offset, setOffset] = React.useState(0);
  const [hasMore, setHasMore] = React.useState(true);

  const PROJECTS_PER_PAGE = 10;

  // Fetch projects when sort or filter changes
  React.useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        setError(null);
        setOffset(0); // Reset offset when filters change
        
        const data = await projectService.getProjects({
          sortBy,
          filterBy,
          limit: PROJECTS_PER_PAGE,
          offset: 0
        });
        
        // Apply controversial sorting on client side if needed
        if (sortBy === 'controversial') {
          data.sort((a, b) => {
            const aRatio = a.downvotes / (a.upvotes + a.downvotes || 1);
            const bRatio = b.downvotes / (b.upvotes + b.downvotes || 1);
            return bRatio - aRatio;
          });
        }
        
        setProjects(data);
        setHasMore(data.length === PROJECTS_PER_PAGE);
      } catch (err) {
        console.error('Error fetching projects:', err);
        setError('Failed to load projects. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [sortBy, filterBy]);

  // Load more projects
  const loadMoreProjects = async () => {
    if (loadingMore || !hasMore) return;

    try {
      setLoadingMore(true);
      setError(null);
      
      const newOffset = offset + PROJECTS_PER_PAGE;
      const data = await projectService.getProjects({
        sortBy,
        filterBy,
        limit: PROJECTS_PER_PAGE,
        offset: newOffset
      });
      
      // Apply controversial sorting on client side if needed
      if (sortBy === 'controversial') {
        data.sort((a, b) => {
          const aRatio = a.downvotes / (a.upvotes + a.downvotes || 1);
          const bRatio = b.downvotes / (b.upvotes + b.downvotes || 1);
          return bRatio - aRatio;
        });
      }
      
      if (data.length > 0) {
        setProjects(prev => [...prev, ...data]);
        setOffset(newOffset);
        setHasMore(data.length === PROJECTS_PER_PAGE);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error('Error loading more projects:', err);
      setError('Failed to load more projects. Please try again.');
    } finally {
      setLoadingMore(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Hero Section Skeleton */}
        <div className="glass-effect rounded-2xl p-8 border border-white/20">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded-lg w-3/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3 mb-6"></div>
            <div className="flex space-x-6">
              <div className="h-4 bg-gray-200 rounded w-24"></div>
              <div className="h-4 bg-gray-200 rounded w-32"></div>
              <div className="h-4 bg-gray-200 rounded w-28"></div>
            </div>
          </div>
        </div>

        {/* Controls Skeleton */}
        <div className="glass-effect rounded-xl p-6 border border-white/20">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>

        {/* Project Cards Skeleton */}
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-effect rounded-xl p-8 border border-white/20">
              <div className="animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3 mb-6"></div>
                <div className="h-40 bg-gray-200 rounded-xl mb-4"></div>
                <div className="flex space-x-2">
                  <div className="h-6 bg-gray-200 rounded w-16"></div>
                  <div className="h-6 bg-gray-200 rounded w-20"></div>
                  <div className="h-6 bg-gray-200 rounded w-14"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error && projects.length === 0) {
    return (
      <div className="space-y-6">
        {/* Hero Section */}
        <div className="glass-effect rounded-2xl p-8 border border-white/20 bg-gradient-to-br from-blue-50/80 to-purple-50/80">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">
              Was This <span className="text-blue-600">Vibe</span> Coded?
            </h1>
          </div>
          <p className="text-lg text-gray-700 mb-6 leading-relaxed">
            Discover and analyze AI-assisted projects. Share your development process, 
            learn from others, and explore the future of coding. Let's see if your code passes the vibe check!
          </p>
          <div className="flex items-center space-x-8 text-sm text-gray-600">
            <div className="flex items-center space-x-2">
              <Bot className="h-5 w-5 text-blue-500" />
              <span className="font-medium">AI Analysis</span>
            </div>
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <span className="font-medium">Community Voting</span>
            </div>
            <div className="flex items-center space-x-2">
              <Zap className="h-5 w-5 text-purple-500" />
              <span className="font-medium">Development Insights</span>
            </div>
          </div>
        </div>

        {/* Error Message */}
        <div className="glass-effect rounded-xl p-8 border border-red-200 bg-red-50/80">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-red-100 rounded-xl">
              <AlertCircle className="h-6 w-6 text-red-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-red-900 mb-2">Error Loading Projects</h3>
              <p className="text-red-700 mb-4">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="button-primary bg-red-500 hover:bg-red-600"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Hero Section */}
      <div className="glass-effect rounded-2xl p-8 border border-white/20 bg-gradient-to-br from-blue-50/80 to-purple-50/80 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-4 left-4 w-20 h-20 bg-blue-500 rounded-full blur-xl"></div>
          <div className="absolute bottom-4 right-4 w-32 h-32 bg-purple-500 rounded-full blur-xl"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-pink-500 rounded-full blur-xl"></div>
        </div>
        
        <div className="relative">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">
              Was This <span className="text-blue-600">Vibe</span> Coded?
            </h1>
          </div>
          <p className="text-lg text-gray-700 mb-6 leading-relaxed max-w-4xl">
            Discover and analyze AI-assisted projects. Share your development process, 
            learn from others, and explore the future of coding. Let's see if your code passes the vibe check!
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm">
            <div className="flex items-center space-x-3 p-4 bg-white/60 rounded-xl backdrop-blur-sm">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Bot className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="font-semibold text-gray-900">AI Analysis</div>
                <div className="text-gray-600">Smart pattern detection</div>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-4 bg-white/60 rounded-xl backdrop-blur-sm">
              <div className="p-2 bg-green-100 rounded-lg">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="font-semibold text-gray-900">Community Voting</div>
                <div className="text-gray-600">Peer review system</div>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-4 bg-white/60 rounded-xl backdrop-blur-sm">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Target className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <div className="font-semibold text-gray-900">VCI Scoring</div>
                <div className="text-gray-600">Precise AI detection</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Controls */}
      <div className="glass-effect rounded-xl p-6 border border-white/20">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          {/* Sort Controls */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600 mr-3 font-medium">Sort by:</span>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSortBy('trending')}
                className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  sortBy === 'trending'
                    ? 'bg-blue-100 text-blue-900 shadow-md'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                }`}
              >
                <TrendingUp className="h-4 w-4" />
                <span>Trending</span>
              </button>
              <button
                onClick={() => setSortBy('recent')}
                className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  sortBy === 'recent'
                    ? 'bg-blue-100 text-blue-900 shadow-md'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                }`}
              >
                <Clock className="h-4 w-4" />
                <span>Recent</span>
              </button>
              <button
                onClick={() => setSortBy('vci-high')}
                className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  sortBy === 'vci-high'
                    ? 'bg-blue-100 text-blue-900 shadow-md'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                }`}
              >
                <Bot className="h-4 w-4" />
                <span>High VCI</span>
              </button>
              <button
                onClick={() => setSortBy('vci-low')}
                className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  sortBy === 'vci-low'
                    ? 'bg-blue-100 text-blue-900 shadow-md'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                }`}
              >
                <Code className="h-4 w-4" />
                <span>Low VCI</span>
              </button>
            </div>
          </div>

          {/* Filter Controls */}
          <div className="flex items-center space-x-3">
            <Filter className="h-4 w-4 text-gray-500" />
            <select
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value as FilterType)}
              className="input-field text-sm border-gray-300 rounded-xl px-4 py-2.5 bg-white/80 backdrop-blur-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Projects</option>
              <option value="verified">Verified Only</option>
              <option value="unverified">Unverified</option>
              <option value="high-ai">High AI Usage (70%+)</option>
              <option value="low-ai">Low AI Usage (&lt;40%)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Projects Feed */}
      <div className="space-y-6">
        {projects.length > 0 ? (
          <>
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
            
            {/* Load More Button */}
            {hasMore && (
              <div className="text-center py-8">
                <button 
                  onClick={loadMoreProjects}
                  disabled={loadingMore}
                  className="button-primary px-8 py-4 text-base disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      <span>Loading more projects...</span>
                    </>
                  ) : (
                    <span>Load More Projects</span>
                  )}
                </button>
              </div>
            )}
            
            {/* End of results message */}
            {!hasMore && projects.length > PROJECTS_PER_PAGE && (
              <div className="text-center py-8">
                <div className="glass-effect rounded-xl p-6 border border-white/20 inline-block">
                  <p className="text-gray-500 text-sm font-medium">
                    🎉 You've reached the end! That's all the projects for now.
                  </p>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16">
            <div className="glass-effect rounded-2xl p-12 border border-white/20 max-w-md mx-auto">
              <div className="p-4 bg-gray-100 rounded-xl w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                <Bot className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">No Projects Found</h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                {filterBy !== 'all' || sortBy !== 'trending' 
                  ? 'Try adjusting your filters or sorting options.'
                  : 'Be the first to submit a project to the community!'
                }
              </p>
              {filterBy !== 'all' || sortBy !== 'trending' ? (
                <button
                  onClick={() => {
                    setSortBy('trending');
                    setFilterBy('all');
                  }}
                  className="button-primary"
                >
                  Clear Filters
                </button>
              ) : null}
            </div>
          </div>
        )}
      </div>

      {/* Error message for load more failures */}
      {error && projects.length > 0 && (
        <div className="text-center py-6">
          <div className="glass-effect rounded-xl p-4 border border-red-200 bg-red-50/80 inline-flex items-center space-x-3">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <span className="text-red-700 text-sm font-medium">{error}</span>
            <button
              onClick={loadMoreProjects}
              className="button-primary bg-red-500 hover:bg-red-600 text-sm px-4 py-2"
            >
              Retry
            </button>
          </div>
        </div>
      )}
    </div>
  );
};