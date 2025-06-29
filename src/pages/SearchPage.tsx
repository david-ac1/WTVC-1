// src/pages/SearchPage.tsx
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Search, Filter, Loader2, X, ChevronDown
} from 'lucide-react';
import { ProjectCard } from '../components/ProjectCard';
import { searchService } from '../lib/supabase';
import { Project, SortType } from '../types';

export const SearchPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [projects, setProjects] = React.useState<Project[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [sortBy, setSortBy] = React.useState<SortType>('relevance');
  const [showFilters, setShowFilters] = React.useState(false);
  const [suggestions, setSuggestions] = React.useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = React.useState(true);
  const [offset, setOffset] = React.useState(0);
  const [hasMore, setHasMore] = React.useState(true);
  const [filters, setFilters] = React.useState({
    vciRange: 'all' as 'all' | 'low' | 'medium' | 'high',
    verified: 'all' as 'all' | 'verified' | 'unverified',
    hasAiTools: 'all' as 'all' | 'yes' | 'no',
  });

  const PROJECTS_PER_PAGE = 20;

  const searchParams = new URLSearchParams(location.search);
  const query = searchParams.get('q') || '';

  // Fetch projects
  React.useEffect(() => {
    const fetchProjects = async () => {
      if (!query.trim()) {
        setProjects([]);
        return;
      }

      try {
        setLoading(true);
        setOffset(0);
        setError(null);

        const searchParams = {
          query: query.trim(),
          sortBy,
          filters,
          limit: PROJECTS_PER_PAGE,
          offset: 0,
        };

        const results = await searchService.searchProjects(searchParams);
        const safeResults = Array.isArray(results) ? results : [];
        
        setProjects(safeResults);
        setHasMore(safeResults.length === PROJECTS_PER_PAGE);
      } catch (err) {
        console.error('Search error:', err);
        setError(`Failed to search projects: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setProjects([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [query, sortBy, filters]);

  // Load more projects
  const loadMore = async () => {
    if (loadingMore || !hasMore) return;

    try {
      setLoadingMore(true);
      const newOffset = offset + PROJECTS_PER_PAGE;

      const results = await searchService.searchProjects({
        query: query.trim(),
        sortBy,
        filters,
        limit: PROJECTS_PER_PAGE,
        offset: newOffset,
      });

      const safeResults = Array.isArray(results) ? results : [];
      setProjects(prev => [...prev, ...safeResults]);
      setOffset(newOffset);
      setHasMore(safeResults.length === PROJECTS_PER_PAGE);
    } catch (err) {
      console.error('Load more error:', err);
      setError('Failed to load more results.');
    } finally {
      setLoadingMore(false);
    }
  };

  // Fetch search suggestions
  React.useEffect(() => {
    if (!query.trim() || query.length < 2) return;

    const timeout = setTimeout(async () => {
      try {
        const results = await searchService.getSearchSuggestions(query, 5);
        setSuggestions(Array.isArray(results) ? results : []);
      } catch (err) {
        setSuggestions([]);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [query]);

  const handleSuggestionClick = (term: string) => {
    navigate(`/search?q=${encodeURIComponent(term)}`);
    setShowSuggestions(false);
  };

  const updateFilter = (key: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const highlightText = (text: string, term: string) => {
    if (!text || !term) return text;
    const regex = new RegExp(`(${term})`, 'gi');
    return text.split(regex).map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="bg-yellow-200 text-yellow-900 px-1 rounded">{part}</mark>
      ) : part
    );
  };

  const hasActiveFilters = Object.values(filters).some(f => f !== 'all') || sortBy !== 'relevance';
  const activeFilterCount = Object.values(filters).filter(f => f !== 'all').length + (sortBy !== 'relevance' ? 1 : 0);

  // Close filters when clicking outside (mobile)
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (showFilters && !target.closest('.filters-container') && !target.closest('.filters-toggle')) {
        setShowFilters(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showFilters]);

  if (!query.trim()) {
    return (
      <div className="min-h-screen bg-black-50">
        <div className="max-w-4xl mx-auto py-8 sm:py-16 text-center px-4">
          <Search className="h-8 w-8 sm:h-10 sm:w-10 text-black-600 mx-auto mb-4" />
          <h1 className="text-lg text-black-600 sm:text-xl font-semibold mb-2">Search Projects</h1>
          <p className="text-black-600 mb-4 text-sm sm:text-base">Try searching for a technology or AI tool.</p>
          <div className="flex flex-wrap gap-2 justify-center max-w-md mx-auto">
            {['React', 'ChatGPT', 'Copilot', 'AI tools'].map(term => (
              <button
                key={term}
                onClick={() => navigate(`/search?q=${term}`)}
                className="px-3 py-1.5 text-xs sm:text-sm bg-blue-100 text-blue-800 rounded-full hover:bg-blue-200 transition-colors"
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 space-y-4 sm:space-y-6 py-4 sm:py-6 lg:py-10">
        {/* Header Section */}
        <div className="bg-white rounded-lg p-4 sm:p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl font-bold text-black-900 truncate">
                Results for "<span className="text-blue-600">{query}</span>"
              </h1>
              {!loading && (
                <p className="text-xs sm:text-sm text-black-600 mt-1">
                  {projects.length} project{projects.length !== 1 ? 's' : ''} found
                </p>
              )}
            </div>
            
            {/* Filters Toggle Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`filters-toggle inline-flex items-center justify-center gap-2 px-3 py-2 sm:px-4 text-sm font-medium border rounded-lg transition-all ${
                hasActiveFilters 
                  ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100' 
                  : 'bg-black border-gray-300 text-black-700 hover:bg-gray-50'
              } ${showFilters ? 'ring-2 ring-blue-500 ring-opacity-20' : ''}`}
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">Filters</span>
              {hasActiveFilters && (
                <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-medium text-black bg-blue-600 rounded-full">
                  {activeFilterCount}
                </span>
              )}
              <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        {/* Search Suggestions */}
        {suggestions.length > 0 && showSuggestions && (
          <div className="bg-blue-50 border border-blue-200 p-3 sm:p-4 rounded-lg relative">
            <button
              onClick={() => setShowSuggestions(false)}
              className="absolute top-2 right-2 sm:top-3 sm:right-3 p-1 hover:bg-blue-100 rounded-full transition-colors"
            >
              <X className="w-4 h-4 text-blue-600" />
            </button>
            <p className="text-sm text-blue-700 mb-2 pr-8">Did you mean:</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map(s => (
                <button
                  key={s}
                  onClick={() => handleSuggestionClick(s)}
                  className="px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-xs sm:text-sm text-blue-800 rounded-full transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Filters Panel */}
        {showFilters && (
          <div className="filters-container bg-white rounded-lg p-4 sm:p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
              <button
                onClick={() => setShowFilters(false)}
                className="sm:hidden p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Sort By */}
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortType)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-black"
                >
                  <option value="relevance">Relevance</option>
                  <option value="recent">Most Recent</option>
                  <option value="trending">Trending</option>
                  <option value="vci-high">Highest VCI</option>
                  <option value="vci-low">Lowest VCI</option>
                </select>
              </div>

              {/* VCI Range */}
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">VCI Range</label>
                <select
                  value={filters.vciRange}
                  onChange={(e) => updateFilter('vciRange', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  <option value="all">All</option>
                  <option value="low">Low (0–39%)</option>
                  <option value="medium">Medium (40–79%)</option>
                  <option value="high">High (80–100%)</option>
                </select>
              </div>

              {/* Verified */}
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">Verification</label>
                <select
                  value={filters.verified}
                  onChange={(e) => updateFilter('verified', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  <option value="all">All</option>
                  <option value="verified">Verified</option>
                  <option value="unverified">Unverified</option>
                </select>
              </div>

              {/* AI Tools */}
              <div>
                <label className="block mb-2 text-sm font-medium text-black-700">AI Tools</label>
                <select
                  value={filters.hasAiTools}
                  onChange={(e) => updateFilter('hasAiTools', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  <option value="all">All</option>
                  <option value="yes">With AI Tools</option>
                  <option value="no">Without AI Tools</option>
                </select>
              </div>
            </div>

            {/* Clear Filters Button */}
            {hasActiveFilters && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    setSortBy('relevance');
                    setFilters({
                      vciRange: 'all',
                      verified: 'all',
                      hasAiTools: 'all',
                    });
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center py-12">
            <div className="flex items-center gap-3 text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Searching projects...</span>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
            <p className="text-red-700 text-center text-sm">{error}</p>
          </div>
        )}

        {/* No Results */}
        {!loading && !error && projects.length === 0 && query.trim() && (
          <div className="bg-white rounded-lg p-8 sm:p-12 text-center shadow-sm">
            <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2 text-gray-900">No projects found</h3>
            <p className="text-gray-600 mb-4 text-sm sm:text-base max-w-md mx-auto">
              Try adjusting your search terms or filters to find what you're looking for.
            </p>
            {hasActiveFilters && (
              <button
                onClick={() => {
                  setSortBy('relevance');
                  setFilters({
                    vciRange: 'all',
                    verified: 'all',
                    hasAiTools: 'all',
                  });
                }}
                className="text-blue-600 hover:text-blue-800 font-medium text-sm"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}

        {/* Results Grid */}
        {!loading && !error && projects.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {projects.map(project => (
              <ProjectCard 
                key={project.id} 
                project={project}
                searchTerm={query}
                highlightText={highlightText}
              />
            ))}
          </div>
        )}

        {/* Load More Button */}
        {hasMore && !loading && !error && projects.length > 0 && (
          <div className="flex justify-center pt-4">
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="px-6 py-3 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm min-w-[120px]"
            >
              {loadingMore ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="animate-spin w-4 h-4" />
                  <span>Loading...</span>
                </span>
              ) : (
                'Load More'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};