import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { Calendar, Github, Trophy, TrendingUp, Bot, Settings, Edit, Plus } from 'lucide-react';
import { userService } from '../lib/supabase';
import { ProjectCard } from '../components/ProjectCard';
import { User, Project } from '../types';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../context/AuthContext';

// Achievement badge thresholds
const ACHIEVEMENT_THRESHOLDS = {
  TOP_CONTRIBUTOR: {
    MIN_PROJECTS: 5,
    MIN_KARMA: 500,
    MIN_TOTAL_UPVOTES: 100
  },
  TRENDING_CREATOR: {
    MIN_TOTAL_UPVOTES: 200,
    MIN_AVG_UPVOTES_PER_PROJECT: 20,
    MIN_PROJECTS: 3
  },
  GITHUB_EXPERT: {
    MIN_AI_TOOLS: 3,
    REQUIRES_SPECIALIZATION: true,
    MIN_PROJECTS: 2
  }
};

export const ProfilePage: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const { user: currentUser } = useAuth();
  const [user, setUser] = React.useState<User | null>(null);
  const [userProjects, setUserProjects] = React.useState<Project[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isOwnProfile, setIsOwnProfile] = React.useState(false);

  React.useEffect(() => {
    const fetchUserData = async () => {
      if (!username) return;

      try {
        setLoading(true);
        setError(null);

        const [userData, projectsData] = await Promise.all([
          userService.getUserProfile(username),
          userService.getUserProjects(username)
        ]);

        if (!userData) {
          setError('User not found');
          return;
        }

        setUser(userData);
        setUserProjects(projectsData);

        // Check if this is the current user's own profile
        if (currentUser) {
          // Get the current user's profile to compare IDs
          const { data: currentUserProfile, error: profileError } = await supabase
            .from('profiles')
            .select('id, username')
            .eq('id', currentUser.id)
            .single();

          if (!profileError && currentUserProfile) {
            // Compare the profile IDs directly
            setIsOwnProfile(currentUserProfile.id === userData.id);
            console.log('DEBUG: Profile ownership check:', {
              currentUserId: currentUserProfile.id,
              viewedUserId: userData.id,
              isOwnProfile: currentUserProfile.id === userData.id,
              currentUsername: currentUserProfile.username,
              viewedUsername: userData.username
            });
          } else {
            // Fallback: compare usernames if profile fetch fails
            const currentUsername = currentUser.user_metadata?.username || currentUser.email?.split('@')[0];
            setIsOwnProfile(currentUsername === userData.username);
            console.log('DEBUG: Fallback profile ownership check:', {
              currentUsername,
              viewedUsername: userData.username,
              isOwnProfile: currentUsername === userData.username
            });
          }
        }
      } catch (err) {
        console.error('Error fetching user data:', err);
        setError('Failed to load user profile');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [username, currentUser]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          {/* Profile Header Skeleton */}
          <div className="bg-gray-100 rounded-2xl p-8 mb-8">
            <div className="flex flex-col md:flex-row items-center md:items-start space-y-6 md:space-y-0 md:space-x-8">
              <div className="w-24 h-24 bg-gray-200 rounded-full"></div>
              <div className="flex-1 text-center md:text-left">
                <div className="h-8 bg-gray-200 rounded w-48 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-32 mb-4"></div>
                <div className="flex justify-center md:justify-start gap-6">
                  <div className="text-center">
                    <div className="h-6 bg-gray-200 rounded w-8 mb-1"></div>
                    <div className="h-3 bg-gray-200 rounded w-12"></div>
                  </div>
                  <div className="text-center">
                    <div className="h-6 bg-gray-200 rounded w-8 mb-1"></div>
                    <div className="h-3 bg-gray-200 rounded w-16"></div>
                  </div>
                  <div className="text-center">
                    <div className="h-6 bg-gray-200 rounded w-8 mb-1"></div>
                    <div className="h-3 bg-gray-200 rounded w-14"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Projects Section Skeleton */}
          <div className="space-y-6">
            <div className="h-6 bg-gray-200 rounded w-48"></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[1, 2].map((i) => (
                <div key={i} className="bg-gray-100 rounded-lg p-6">
                  <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          {error || 'User Not Found'}
        </h1>
        <p className="text-gray-600">
          {error || "This user doesn't exist or hasn't joined yet."}
        </p>
      </div>
    );
  }

  const totalUpvotes = userProjects.reduce((sum, project) => sum + project.upvotes, 0);
  const avgAiScore = userProjects.length > 0 
    ? Math.round(userProjects.reduce((sum, project) => sum + project.vciScore, 0) / userProjects.length)
    : 0;
  const avgUpvotesPerProject = userProjects.length > 0 ? totalUpvotes / userProjects.length : 0;

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long' 
    });
  };

  // Achievement badge qualification checks
  const qualifiesForTopContributor = () => {
    return user.projectsSubmitted >= ACHIEVEMENT_THRESHOLDS.TOP_CONTRIBUTOR.MIN_PROJECTS &&
           user.karma >= ACHIEVEMENT_THRESHOLDS.TOP_CONTRIBUTOR.MIN_KARMA &&
           totalUpvotes >= ACHIEVEMENT_THRESHOLDS.TOP_CONTRIBUTOR.MIN_TOTAL_UPVOTES;
  };

  const qualifiesForTrendingCreator = () => {
    return totalUpvotes >= ACHIEVEMENT_THRESHOLDS.TRENDING_CREATOR.MIN_TOTAL_UPVOTES &&
           avgUpvotesPerProject >= ACHIEVEMENT_THRESHOLDS.TRENDING_CREATOR.MIN_AVG_UPVOTES_PER_PROJECT &&
           user.projectsSubmitted >= ACHIEVEMENT_THRESHOLDS.TRENDING_CREATOR.MIN_PROJECTS;
  };

  const qualifiesForGitHubExpert = () => {
    return user.aiToolsUsed.length >= ACHIEVEMENT_THRESHOLDS.GITHUB_EXPERT.MIN_AI_TOOLS &&
           (!ACHIEVEMENT_THRESHOLDS.GITHUB_EXPERT.REQUIRES_SPECIALIZATION || user.specialization) &&
           user.projectsSubmitted >= ACHIEVEMENT_THRESHOLDS.GITHUB_EXPERT.MIN_PROJECTS;
  };

  // Count earned badges
  const earnedBadges = [
    qualifiesForTopContributor(),
    qualifiesForTrendingCreator(),
    qualifiesForGitHubExpert()
  ].filter(Boolean).length;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Profile Header */}
      <div className="bg-white border border-gray-300 rounded-2xl p-8 mb-8">
        <div className="flex flex-col md:flex-row items-center md:items-start space-y-6 md:space-y-0 md:space-x-8">
          {/* Avatar */}
          <div className="relative">
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.username}
                className="w-24 h-24 rounded-full object-cover border-4 border-gray-200"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  target.nextElementSibling?.classList.remove('hidden');
                }}
              />
            ) : null}
            <div className={`w-24 h-24 bg-blue-500 rounded-full flex items-center justify-center text-white text-2xl font-bold ${user.avatar ? 'hidden' : ''}`}>
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 rounded-full border-4 border-white flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full"></div>
            </div>
          </div>

          {/* User Info */}
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">@{user.username}</h1>
            <div className="flex items-center justify-center md:justify-start space-x-1 text-gray-500 mb-4">
              <Calendar className="h-4 w-4" />
              <span>Joined {formatDate(user.joinedAt)}</span>
              {earnedBadges > 0 && (
                <>
                  <span>•</span>
                  <span className="text-amber-600 font-medium">{earnedBadges} achievement{earnedBadges !== 1 ? 's' : ''}</span>
                </>
              )}
            </div>
            
            {user.specialization && (
              <p className="text-gray-600 mb-4">{user.specialization}</p>
            )}
            
            {/* Stats */}
            <div className="flex flex-wrap justify-center md:justify-start gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{user.projectsSubmitted}</div>
                <div className="text-sm text-gray-500">Projects</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-500">{totalUpvotes}</div>
                <div className="text-sm text-gray-500">Total Upvotes</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-500">{avgAiScore}%</div>
                <div className="text-sm text-gray-500">Avg VCI Score</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-500">{user.karma}</div>
                <div className="text-sm text-gray-500">Karma</div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col space-y-3">
            {isOwnProfile ? (
              <Link
                to={`/profile/${user.username}/edit`}
                className="flex items-center space-x-2 px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors"
              >
                <Edit className="h-4 w-4" />
                <span>Edit Profile</span>
              </Link>
            ) : (
              <>
                <button className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors">
                  Follow
                </button>
                <button className="px-6 py-2 border border-gray-300 hover:border-gray-400 text-gray-700 font-medium rounded-lg transition-colors">
                  Message
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* AI Tools Used */}
      {user.aiToolsUsed && user.aiToolsUsed.length > 0 && (
        <div className="bg-white border border-gray-300 rounded-lg p-6 mb-8">
          <div className="flex items-center space-x-2 mb-4">
            <Bot className="h-5 w-5 text-blue-500" />
            <h3 className="text-lg font-semibold text-gray-900">AI Tools Used</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {user.aiToolsUsed.map((tool) => (
              <span
                key={tool}
                className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
              >
                {tool}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Achievement Badges - Only show if user qualifies */}
      {earnedBadges > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* Top Contributor Badge */}
          {qualifiesForTopContributor() && (
            <div className="bg-white border border-gray-300 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Trophy className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <div className="text-gray-900 font-medium">Top Contributor</div>
                  <div className="text-sm text-gray-500">
                    {user.projectsSubmitted}+ projects, {user.karma}+ karma
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Trending Creator Badge */}
          {qualifiesForTrendingCreator() && (
            <div className="bg-white border border-gray-300 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <div className="text-gray-900 font-medium">Trending Creator</div>
                  <div className="text-sm text-gray-500">
                    {totalUpvotes} total upvotes, {Math.round(avgUpvotesPerProject)} avg per project
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* GitHub Expert Badge */}
          {qualifiesForGitHubExpert() && (
            <div className="bg-white border border-gray-300 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Github className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <div className="text-gray-900 font-medium">AI Development Expert</div>
                  <div className="text-sm text-gray-500">
                    {user.aiToolsUsed.length} AI tools, specialized developer
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Achievement Progress - Show for own profile if no badges earned */}
      {isOwnProfile && earnedBadges === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">Unlock Achievement Badges</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Top Contributor Progress */}
            <div className="bg-white rounded-lg p-4 border border-blue-200">
              <div className="flex items-center space-x-2 mb-2">
                <Trophy className="h-5 w-5 text-yellow-600" />
                <span className="font-medium text-gray-900">Top Contributor</span>
              </div>
              <div className="space-y-1 text-sm text-gray-600">
                <div>Projects: {user.projectsSubmitted}/{ACHIEVEMENT_THRESHOLDS.TOP_CONTRIBUTOR.MIN_PROJECTS}</div>
                <div>Karma: {user.karma}/{ACHIEVEMENT_THRESHOLDS.TOP_CONTRIBUTOR.MIN_KARMA}</div>
                <div>Total Upvotes: {totalUpvotes}/{ACHIEVEMENT_THRESHOLDS.TOP_CONTRIBUTOR.MIN_TOTAL_UPVOTES}</div>
              </div>
            </div>

            {/* Trending Creator Progress */}
            <div className="bg-white rounded-lg p-4 border border-blue-200">
              <div className="flex items-center space-x-2 mb-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-gray-900">Trending Creator</span>
              </div>
              <div className="space-y-1 text-sm text-gray-600">
                <div>Projects: {user.projectsSubmitted}/{ACHIEVEMENT_THRESHOLDS.TRENDING_CREATOR.MIN_PROJECTS}</div>
                <div>Total Upvotes: {totalUpvotes}/{ACHIEVEMENT_THRESHOLDS.TRENDING_CREATOR.MIN_TOTAL_UPVOTES}</div>
                <div>Avg Upvotes: {Math.round(avgUpvotesPerProject)}/{ACHIEVEMENT_THRESHOLDS.TRENDING_CREATOR.MIN_AVG_UPVOTES_PER_PROJECT}</div>
              </div>
            </div>

            {/* AI Expert Progress */}
            <div className="bg-white rounded-lg p-4 border border-blue-200">
              <div className="flex items-center space-x-2 mb-2">
                <Github className="h-5 w-5 text-green-600" />
                <span className="font-medium text-gray-900">AI Development Expert</span>
              </div>
              <div className="space-y-1 text-sm text-gray-600">
                <div>Projects: {user.projectsSubmitted}/{ACHIEVEMENT_THRESHOLDS.GITHUB_EXPERT.MIN_PROJECTS}</div>
                <div>AI Tools: {user.aiToolsUsed.length}/{ACHIEVEMENT_THRESHOLDS.GITHUB_EXPERT.MIN_AI_TOOLS}</div>
                <div>Specialization: {user.specialization ? '✓' : 'Not set'}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Projects Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            Projects by @{user.username}
          </h2>
          <span className="text-gray-500 text-sm">
            {userProjects.length} project{userProjects.length !== 1 ? 's' : ''}
          </span>
        </div>

        {userProjects.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {userProjects.map((project) => (
              <div key={project.id} className="relative">
                <ProjectCard project={project} />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white border border-gray-300 rounded-lg">
            <Github className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              {isOwnProfile ? "You haven't submitted any projects yet." : "No projects submitted yet."}
            </p>
            {isOwnProfile && (
              <Link
                to="/submit"
                className="mt-4 inline-flex items-center px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-lg transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                Submit Your First Project
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
};