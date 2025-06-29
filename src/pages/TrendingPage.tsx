import React from 'react';
import { TrendingUp, Clock, Flame, Calendar, Bot, Users, ArrowUp } from 'lucide-react';
import { ProjectCard } from '../components/ProjectCard';
import { projectService } from '../lib/supabase';
import { Project } from '../types';

interface TrendingMetrics {
  hotProjects: Project[];
  risingProjects: Project[];
  controversialProjects: Project[];
  weeklyStats: {
    totalSubmissions: number;
    averageVciScore: number;
    topAiTool: string;
    mostActiveDay: string;
  };
}

export const TrendingPage: React.FC = () => {
  const [metrics, setMetrics] = React.useState<TrendingMetrics | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState<'hot' | 'rising' | 'controversial'>('hot');

  React.useEffect(() => {
    const fetchTrendingData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch projects with different sorting criteria
        const [hotProjects, recentProjects, allProjects] = await Promise.all([
          projectService.getProjects({ sortBy: 'trending', limit: 20 }),
          projectService.getProjects({ sortBy: 'recent', limit: 50 }),
          projectService.getProjects({ limit: 100 })
        ]);

        // Calculate trending metrics
        const trendingMetrics = calculateTrendingMetrics(hotProjects, recentProjects, allProjects);
        setMetrics(trendingMetrics);
      } catch (err) {
        console.error('Error fetching trending data:', err);
        setError('Failed to load trending data');
      } finally {
        setLoading(false);
      }
    };

    fetchTrendingData();
  }, []);

  const calculateTrendingMetrics = (
    hotProjects: Project[],
    recentProjects: Project[],
    allProjects: Project[]
  ): TrendingMetrics => {
    // Hot projects: highest upvote ratio in last 7 days
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const recentHotProjects = recentProjects
      .filter(p => new Date(p.submittedAt) >= weekAgo)
      .sort((a, b) => {
        const aRatio = a.upvotes / Math.max(1, a.upvotes + a.downvotes);
        const bRatio = b.upvotes / Math.max(1, b.upvotes + b.downvotes);
        return bRatio - aRatio;
      })
      .slice(0, 10);

    // Rising projects: recent projects with good engagement
    const risingProjects = recentProjects
      .filter(p => {
        const daysSinceSubmission = (Date.now() - new Date(p.submittedAt).getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceSubmission <= 3 && (p.upvotes + p.commentCount) > 0;
      })
      .sort((a, b) => {
        const aScore = (a.upvotes * 2) + a.commentCount;
        const bScore = (b.upvotes * 2) + b.commentCount;
        return bScore - aScore;
      })
      .slice(0, 10);

    // Controversial projects: high engagement but mixed votes
    const controversialProjects = allProjects
      .filter(p => p.upvotes + p.downvotes >= 5) // Minimum vote threshold
      .sort((a, b) => {
        const aControversy = Math.min(a.upvotes, a.downvotes) / Math.max(1, Math.max(a.upvotes, a.downvotes));
        const bControversy = Math.min(b.upvotes, b.downvotes) / Math.max(1, Math.max(b.upvotes, b.downvotes));
        return bControversy - aControversy;
      })
      .slice(0, 10);

    // Weekly stats
    const weeklyProjects = recentProjects.filter(p => new Date(p.submittedAt) >= weekAgo);
    const averageVciScore = weeklyProjects.length > 0 
      ? Math.round(weeklyProjects.reduce((sum, p) => sum + p.vciScore, 0) / weeklyProjects.length)
      : 0;

    // Find most used AI tool this week
    const aiToolCounts = new Map<string, number>();
    weeklyProjects.forEach(project => {
      project.aiTools.forEach(tool => {
        aiToolCounts.set(tool.name, (aiToolCounts.get(tool.name) || 0) + 1);
      });
    });
    const topAiTool = Array.from(aiToolCounts.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'None';

    // Find most active day (simplified)
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayCounts = new Map<string, number>();
    weeklyProjects.forEach(project => {
      const day = dayNames[new Date(project.submittedAt).getDay()];
      dayCounts.set(day, (dayCounts.get(day) || 0) + 1);
    });
    const mostActiveDay = Array.from(dayCounts.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    return {
      hotProjects: recentHotProjects,
      risingProjects,
      controversialProjects,
      weeklyStats: {
        totalSubmissions: weeklyProjects.length,
        averageVciScore,
        topAiTool,
        mostActiveDay
      }
    };
  };

  const getCurrentProjects = () => {
    if (!metrics) return [];
    switch (activeTab) {
      case 'hot':
        return metrics.hotProjects;
      case 'rising':
        return metrics.risingProjects;
      case 'controversial':
        return metrics.controversialProjects;
      default:
        return metrics.hotProjects;
    }
  };

  const getTabIcon = (tab: string) => {
    switch (tab) {
      case 'hot':
        return <Flame className="h-4 w-4" />;
      case 'rising':
        return <TrendingUp className="h-4 w-4" />;
      case 'controversial':
        return <ArrowUp className="h-4 w-4" />;
      default:
        return <Flame className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-gray-100 rounded-lg p-6">
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-gray-100 rounded-lg p-6">
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
        <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Trending Unavailable</h1>
        <p className="text-gray-600">{error || 'Unable to load trending data'}</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-4">
          <TrendingUp className="h-8 w-8 text-green-500" />
          <h1 className="text-3xl font-bold text-gray-900">Trending Projects</h1>
        </div>
        <p className="text-gray-600">
          Discover what's hot, rising, and controversial in the AI development community
        </p>
      </div>

      {/* Weekly Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white border border-gray-300 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">This Week</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.weeklyStats.totalSubmissions}</p>
              <p className="text-xs text-gray-500">New submissions</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-300 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg VCI Score</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.weeklyStats.averageVciScore}%</p>
              <p className="text-xs text-gray-500">This week</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <Bot className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-300 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Top AI Tool</p>
              <p className="text-lg font-bold text-gray-900 truncate">{metrics.weeklyStats.topAiTool}</p>
              <p className="text-xs text-gray-500">Most popular</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <Bot className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-300 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Most Active</p>
              <p className="text-lg font-bold text-gray-900">{metrics.weeklyStats.mostActiveDay}</p>
              <p className="text-xs text-gray-500">Day of week</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <Users className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Trending Tabs */}
      <div className="bg-white border border-gray-300 rounded-lg">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex space-x-1">
            {[
              { key: 'hot', label: 'Hot', description: 'Highest engagement this week' },
              { key: 'rising', label: 'Rising', description: 'New projects gaining traction' },
              { key: 'controversial', label: 'Controversial', description: 'Mixed community reactions' }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'bg-blue-100 text-blue-900'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {getTabIcon(tab.key)}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {activeTab === 'hot' && 'Projects with the highest engagement this week'}
            {activeTab === 'rising' && 'New projects that are quickly gaining community attention'}
            {activeTab === 'controversial' && 'Projects with significant debate and mixed reactions'}
          </p>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {getCurrentProjects().length > 0 ? (
            <div className="space-y-6">
              {getCurrentProjects().map((project, index) => (
                <div key={project.id} className="relative">
                  {/* Trending Badge */}
                  <div className="absolute -top-2 -left-2 z-10">
                    <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      activeTab === 'hot' ? 'bg-red-100 text-red-800' :
                      activeTab === 'rising' ? 'bg-green-100 text-green-800' :
                      'bg-orange-100 text-orange-800'
                    }`}>
                      #{index + 1}
                    </div>
                  </div>
                  <ProjectCard project={project} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                {getTabIcon(activeTab)}
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No {activeTab} projects yet
              </h3>
              <p className="text-gray-600">
                {activeTab === 'hot' && 'No projects are trending this week. Be the first to submit something amazing!'}
                {activeTab === 'rising' && 'No new projects are rising yet. Submit a project to get the ball rolling!'}
                {activeTab === 'controversial' && 'No controversial discussions yet. The community is in agreement!'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Trending Insights */}
      <div className="mt-8 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-green-900 mb-3">Trending Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-green-800">
          <div>
            <strong>Community Activity:</strong> {metrics.weeklyStats.totalSubmissions} new projects this week
            {metrics.weeklyStats.totalSubmissions > 10 ? ' - High activity!' : metrics.weeklyStats.totalSubmissions > 5 ? ' - Moderate activity' : ' - Growing community'}
          </div>
          <div>
            <strong>AI Trend:</strong> Average VCI score of {metrics.weeklyStats.averageVciScore}% 
            {metrics.weeklyStats.averageVciScore > 70 ? ' indicates heavy AI adoption' : 
             metrics.weeklyStats.averageVciScore > 40 ? ' shows balanced AI-human collaboration' : 
             ' suggests traditional development approaches'}
          </div>
          <div>
            <strong>Popular Tool:</strong> {metrics.weeklyStats.topAiTool} is leading the AI tools this week
          </div>
          <div>
            <strong>Peak Activity:</strong> {metrics.weeklyStats.mostActiveDay}s are the most active submission days
          </div>
        </div>
      </div>
    </div>
  );
};