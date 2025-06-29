import React from 'react';
import { BarChart3, TrendingUp, Users, Bot, Calendar, Award, Target, Zap } from 'lucide-react';
import { projectService } from '../lib/supabase';
import { Project } from '../types';

interface AnalyticsData {
  totalProjects: number;
  averageVciScore: number;
  aiAssistedProjects: number;
  humanCodedProjects: number;
  verifiedProjects: number;
  topAiTools: Array<{ name: string; count: number; percentage: number }>;
  vciDistribution: Array<{ range: string; count: number; percentage: number }>;
  monthlySubmissions: Array<{ month: string; count: number }>;
  topTechnologies: Array<{ name: string; count: number; percentage: number }>;
}

export const AnalyticsPage: React.FC = () => {
  const [analytics, setAnalytics] = React.useState<AnalyticsData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch all projects for analysis
        const projects = await projectService.getProjects({ limit: 1000 });
        
        if (projects.length === 0) {
          setAnalytics({
            totalProjects: 0,
            averageVciScore: 0,
            aiAssistedProjects: 0,
            humanCodedProjects: 0,
            verifiedProjects: 0,
            topAiTools: [],
            vciDistribution: [],
            monthlySubmissions: [],
            topTechnologies: []
          });
          return;
        }

        // Calculate analytics
        const analyticsData = calculateAnalytics(projects);
        setAnalytics(analyticsData);
      } catch (err) {
        console.error('Error fetching analytics:', err);
        setError('Failed to load analytics data');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  const calculateAnalytics = (projects: Project[]): AnalyticsData => {
    const totalProjects = projects.length;
    const averageVciScore = Math.round(
      projects.reduce((sum, p) => sum + p.vciScore, 0) / totalProjects
    );
    
    const aiAssistedProjects = projects.filter(p => p.vciScore >= 60).length;
    const humanCodedProjects = projects.filter(p => p.vciScore < 40).length;
    const verifiedProjects = projects.filter(p => p.isVerified).length;

    // AI Tools analysis
    const aiToolsMap = new Map<string, number>();
    projects.forEach(project => {
      project.aiTools.forEach(tool => {
        aiToolsMap.set(tool.name, (aiToolsMap.get(tool.name) || 0) + 1);
      });
    });

    const topAiTools = Array.from(aiToolsMap.entries())
      .map(([name, count]) => ({
        name,
        count,
        percentage: Math.round((count / totalProjects) * 100)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // VCI Score distribution
    const vciRanges = [
      { range: '0-20', min: 0, max: 20 },
      { range: '21-40', min: 21, max: 40 },
      { range: '41-60', min: 41, max: 60 },
      { range: '61-80', min: 61, max: 80 },
      { range: '81-100', min: 81, max: 100 }
    ];

    const vciDistribution = vciRanges.map(range => {
      const count = projects.filter(p => p.vciScore >= range.min && p.vciScore <= range.max).length;
      return {
        range: range.range,
        count,
        percentage: Math.round((count / totalProjects) * 100)
      };
    });

    // Monthly submissions (last 6 months)
    const monthlySubmissions = calculateMonthlySubmissions(projects);

    // Top technologies
    const techMap = new Map<string, number>();
    projects.forEach(project => {
      project.technologies.forEach(tech => {
        techMap.set(tech, (techMap.get(tech) || 0) + 1);
      });
    });

    const topTechnologies = Array.from(techMap.entries())
      .map(([name, count]) => ({
        name,
        count,
        percentage: Math.round((count / totalProjects) * 100)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalProjects,
      averageVciScore,
      aiAssistedProjects,
      humanCodedProjects,
      verifiedProjects,
      topAiTools,
      vciDistribution,
      monthlySubmissions,
      topTechnologies
    };
  };

  const calculateMonthlySubmissions = (projects: Project[]) => {
    const monthCounts = new Map<string, number>();
    const now = new Date();
    
    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      monthCounts.set(monthKey, 0);
    }

    // Count projects by month
    projects.forEach(project => {
      const projectDate = new Date(project.submittedAt);
      const monthKey = projectDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      if (monthCounts.has(monthKey)) {
        monthCounts.set(monthKey, (monthCounts.get(monthKey) || 0) + 1);
      }
    });

    return Array.from(monthCounts.entries()).map(([month, count]) => ({
      month,
      count
    }));
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

  if (error || !analytics) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
        <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Analytics Unavailable</h1>
        <p className="text-gray-600">{error || 'Unable to load analytics data'}</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-4">
          <BarChart3 className="h-8 w-8 text-blue-500" />
          <h1 className="text-3xl font-bold text-gray-900">Community Analytics</h1>
        </div>
        <p className="text-gray-600">
          Insights into AI-assisted development patterns and community trends
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white border border-gray-300 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Projects</p>
              <p className="text-3xl font-bold text-gray-900">{analytics.totalProjects.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Target className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-300 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg VCI Score</p>
              <p className="text-3xl font-bold text-gray-900">{analytics.averageVciScore}%</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <Bot className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-300 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">AI-Assisted</p>
              <p className="text-3xl font-bold text-gray-900">{analytics.aiAssistedProjects}</p>
              <p className="text-xs text-gray-500">
                {Math.round((analytics.aiAssistedProjects / analytics.totalProjects) * 100)}% of total
              </p>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <Zap className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-300 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Verified</p>
              <p className="text-3xl font-bold text-gray-900">{analytics.verifiedProjects}</p>
              <p className="text-xs text-gray-500">
                {Math.round((analytics.verifiedProjects / analytics.totalProjects) * 100)}% of total
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <Award className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* VCI Score Distribution */}
        <div className="bg-white border border-gray-300 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">VCI Score Distribution</h3>
          <div className="space-y-3">
            {analytics.vciDistribution.map((item) => (
              <div key={item.range} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-medium text-gray-700 w-12">{item.range}</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-2 w-32">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${item.percentage}%` }}
                    ></div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium text-gray-900">{item.count}</span>
                  <span className="text-xs text-gray-500 ml-1">({item.percentage}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly Submissions */}
        <div className="bg-white border border-gray-300 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Submissions</h3>
          <div className="space-y-3">
            {analytics.monthlySubmissions.map((item) => (
              <div key={item.month} className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">{item.month}</span>
                <div className="flex items-center space-x-2">
                  <div className="bg-gray-200 rounded-full h-2 w-24">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{ 
                        width: `${Math.max(10, (item.count / Math.max(...analytics.monthlySubmissions.map(m => m.count))) * 100)}%` 
                      }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-8 text-right">{item.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top AI Tools */}
        <div className="bg-white border border-gray-300 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Most Popular AI Tools</h3>
          <div className="space-y-3">
            {analytics.topAiTools.slice(0, 8).map((tool, index) => (
              <div key={tool.name} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-medium text-gray-500 w-4">#{index + 1}</span>
                  <span className="text-sm font-medium text-gray-900">{tool.name}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="bg-gray-200 rounded-full h-2 w-20">
                    <div
                      className="bg-purple-500 h-2 rounded-full"
                      style={{ width: `${tool.percentage}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-600 w-12 text-right">{tool.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Technologies */}
        <div className="bg-white border border-gray-300 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Most Used Technologies</h3>
          <div className="space-y-3">
            {analytics.topTechnologies.slice(0, 8).map((tech, index) => (
              <div key={tech.name} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-medium text-gray-500 w-4">#{index + 1}</span>
                  <span className="text-sm font-medium text-gray-900">{tech.name}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="bg-gray-200 rounded-full h-2 w-20">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${tech.percentage}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-600 w-12 text-right">{tech.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Insights */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">Key Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
          <div>
            <strong>AI Adoption:</strong> {Math.round((analytics.aiAssistedProjects / analytics.totalProjects) * 100)}% of projects show significant AI assistance (VCI ≥ 60%)
          </div>
          <div>
  <strong>Human Creativity:</strong>{" "}
  {`${Math.round((analytics.humanCodedProjects / analytics.totalProjects) * 100)}% remain primarily human-coded (VCI < 40%)`}
</div>

          <div>
            <strong>Quality Control:</strong> {Math.round((analytics.verifiedProjects / analytics.totalProjects) * 100)}% of projects have been community-verified
          </div>
          <div>
            <strong>Community Growth:</strong> {analytics.monthlySubmissions[analytics.monthlySubmissions.length - 1]?.count || 0} projects submitted this month
          </div>
        </div>
      </div>
    </div>
  );
};