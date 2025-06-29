import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUp, ArrowDown, MessageCircle, ExternalLink, Github, Calendar, Bot, Verified, Eye, Tag, Share, Bookmark, BookmarkCheck, MoreHorizontal, Award, TrendingUp, Copy, Twitter, Linkedin, Facebook } from 'lucide-react';
import { Project } from '../types';
import { votingService } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

interface ProjectCardProps {
  project: Project;
  showFullContent?: boolean;
  highlight?: (text: string, term: string) => React.ReactNode;
  query?: string;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ 
  project, 
  showFullContent = false,
  highlight,
  query = ''
}) => {
  const { user } = useAuth();
  const [userVote, setUserVote] = React.useState<'up' | 'down' | null>(null);
  const [localUpvotes, setLocalUpvotes] = React.useState(project.upvotes);
  const [localDownvotes, setLocalDownvotes] = React.useState(project.downvotes);
  const [isVoting, setIsVoting] = React.useState(false);
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [showShareMenu, setShowShareMenu] = React.useState(false);
  const [shareSuccess, setShareSuccess] = React.useState(false);
  const [isSaved, setIsSaved] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);

  // Fetch user's current vote and save status when component mounts
  React.useEffect(() => {
    const fetchUserData = async () => {
      if (user) {
        try {
          const [vote, savedStatus] = await Promise.all([
            votingService.getUserProjectVote(project.id, user.id),
            votingService.getUserSavedStatus?.(project.id, user.id) || Promise.resolve(false)
          ]);
          setUserVote(vote);
          setIsSaved(savedStatus);
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      }
    };

    fetchUserData();
  }, [project.id, user]);

  const handleVote = async (type: 'up' | 'down') => {
    if (!user || isVoting) return;

    try {
      setIsVoting(true);
      const newVote = userVote === type ? null : type;
      const prevVote = userVote;
      setUserVote(newVote);
      
      let newUpvotes = localUpvotes;
      let newDownvotes = localDownvotes;
      
      if (prevVote === 'up') newUpvotes--;
      if (prevVote === 'down') newDownvotes--;
      if (newVote === 'up') newUpvotes++;
      if (newVote === 'down') newDownvotes++;
      
      setLocalUpvotes(newUpvotes);
      setLocalDownvotes(newDownvotes);

      await votingService.voteOnProject(project.id, newVote);
    } catch (error) {
      console.error('Error voting on project:', error);
      setUserVote(userVote);
      setLocalUpvotes(project.upvotes);
      setLocalDownvotes(project.downvotes);
    } finally {
      setIsVoting(false);
    }
  };

  const handleSave = async () => {
    if (!user || isSaving) return;

    try {
      setIsSaving(true);
      const newSavedStatus = !isSaved;
      setIsSaved(newSavedStatus);
      
      // Call your save/unsave API here
      await votingService.toggleSaveProject?.(project.id, newSavedStatus);
    } catch (error) {
      console.error('Error saving project:', error);
      setIsSaved(isSaved);
    } finally {
      setIsSaving(false);
    }
  };

  const getVCIColor = (score: number) => {
    if (score >= 80) return 'bg-red-500';
    if (score >= 60) return 'bg-orange-500';
    if (score >= 40) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getVCILabel = (score: number) => {
    if (score >= 80) return 'Highly AI-Generated';
    if (score >= 60) return 'AI-Assisted';
    if (score >= 40) return 'Hybrid Approach';
    return 'Mostly Human-Coded';
  };

  const formatDate = (date: Date) => {
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

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return num.toString();
  };

  const netVotes = localUpvotes - localDownvotes;
  const votePercentage = localUpvotes + localDownvotes > 0 ? Math.round((localUpvotes / (localUpvotes + localDownvotes)) * 100) : 0;

  const renderText = (text: string) => {
    if (highlight && query) {
      return highlight(text, query);
    }
    return text;
  };

  const truncateDescription = (text: string, maxLength: number = 180) => {
    if (text.length <= maxLength || isExpanded) return text;
    return text.substring(0, maxLength) + '...';
  };

  const handleShare = async (platform?: string) => {
    const projectUrl = `${window.location.origin}/project/${project.id}`;
    const shareText = `Check out "${project.title}" - ${project.description.substring(0, 100)}...`;

    if (platform === 'copy') {
      try {
        await navigator.clipboard.writeText(projectUrl);
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 2000);
      } catch (error) {
        console.error('Failed to copy to clipboard:', error);
      }
    } else if (platform === 'twitter') {
      const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(projectUrl)}`;
      window.open(twitterUrl, '_blank', 'width=550,height=420');
    } else if (platform === 'linkedin') {
      const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(projectUrl)}`;
      window.open(linkedinUrl, '_blank', 'width=550,height=420');
    } else if (platform === 'facebook') {
      const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(projectUrl)}`;
      window.open(facebookUrl, '_blank', 'width=550,height=420');
    } else if (navigator.share) {
      try {
        await navigator.share({
          title: project.title,
          text: shareText,
          url: projectUrl,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    }
    setShowShareMenu(false);
  };

  return (
    <article className="bg-white border border-gray-200 rounded-xl hover:border-gray-300 transition-all duration-300 hover:shadow-lg card-hover group max-w-full">
      <div className="flex">
        {/* Enhanced Vote Section */}
        <div className="flex flex-col items-center p-3 sm:p-4 bg-gradient-to-b from-gray-50 to-gray-100 border-r border-gray-200 min-w-[65px] sm:min-w-[75px] rounded-l-xl">
          <button
            onClick={() => handleVote('up')}
            disabled={!user || isVoting}
            className={`p-2 sm:p-2.5 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group/vote ${
              userVote === 'up' 
                ? 'text-orange-500 bg-orange-100 shadow-md scale-105' 
                : 'text-gray-400 hover:text-orange-500 hover:bg-orange-50 hover:scale-110'
            }`}
            title={user ? 'Upvote' : 'Sign in to vote'}
            aria-label="Upvote project"
          >
            <ArrowUp className="h-4 w-4 sm:h-5 sm:w-5 group-hover/vote:scale-110 transition-transform" />
          </button>
          
          <div className="flex flex-col items-center py-2">
            <span className={`text-sm sm:text-base font-bold transition-colors ${
              userVote === 'up' ? 'text-orange-500' : 
              userVote === 'down' ? 'text-blue-500' : 'text-gray-700'
            }`}>
              {formatNumber(Math.abs(netVotes))}
            </span>
            {(localUpvotes + localDownvotes) > 0 && (
              <div className="w-full bg-gray-200 rounded-full h-1 mt-1.5">
                <div 
                  className="bg-gradient-to-r from-orange-400 to-orange-500 h-1 rounded-full transition-all duration-500"
                  style={{ width: `${votePercentage}%` }}
                />
              </div>
            )}
          </div>
          
          <button
            onClick={() => handleVote('down')}
            disabled={!user || isVoting}
            className={`p-2 sm:p-2.5 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group/vote ${
              userVote === 'down' 
                ? 'text-blue-500 bg-blue-100 shadow-md scale-105' 
                : 'text-gray-400 hover:text-blue-500 hover:bg-blue-50 hover:scale-110'
            }`}
            title={user ? 'Downvote' : 'Sign in to vote'}
            aria-label="Downvote project"
          >
            <ArrowDown className="h-4 w-4 sm:h-5 sm:w-5 group-hover/vote:scale-110 transition-transform" />
          </button>
        </div>

        {/* Optimized Content Section */}
        <div className="flex-1 p-3 sm:p-4 min-w-0">
          {/* Streamlined Header */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-gray-500 mb-2">
            <span className="font-medium text-blue-600">r/VibeCoded</span>
            <span>•</span>
            <span>Posted by</span>
            <Link 
              to={`/profile/${project.submittedBy}`}
              className="font-medium text-gray-700 hover:text-blue-600 transition-colors"
            >
              u/{project.submittedBy}
            </Link>
            <span>•</span>
            <span>{formatDate(project.submittedAt)}</span>
            {project.isVerified && (
              <>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <Verified className="h-3 w-3 text-blue-500" />
                  <span className="text-blue-600 font-medium">Verified</span>
                  <Award className="h-3 w-3 text-yellow-500" />
                </div>
              </>
            )}
          </div>

          {/* Title */}
          <Link to={`/project/${project.id}`} className="block group/title">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-2.5 group-hover/title:text-blue-600 transition-colors leading-tight">
              {renderText(project.title)}
            </h2>
          </Link>

          {/* VCI Score Badge */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-3">
            <div className={`inline-flex items-center px-2.5 sm:px-3 py-1.5 rounded-full text-sm font-semibold text-white shadow-md ${getVCIColor(project.vciScore)}`}>
              <Bot className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5" />
              VCI: {project.vciScore}%
            </div>
            <span className="text-xs sm:text-sm text-gray-500 hidden sm:inline">{getVCILabel(project.vciScore)}</span>
            {project.communityVciScore && (
              <span className="text-xs text-gray-500">
                Community: {project.communityVciScore}%
              </span>
            )}
          </div>

          {/* Description */}
          <div className="mb-3">
            <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
              {renderText(truncateDescription(project.description))}
            </p>
            {project.description.length > 180 && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium mt-1 transition-colors"
              >
                {isExpanded ? 'Show less' : 'Read more'}
              </button>
            )}
          </div>

          {/* Optimized Screenshot Preview */}
          {project.screenshots.length > 0 && (
            <div className="mb-3 sm:mb-4">
              <div className="relative group/image">
                <img
                  src={project.screenshots[0]}
                  alt={project.title}
                  className="w-full h-40 sm:h-48 object-cover rounded-lg border border-gray-200 group-hover/image:border-gray-300 transition-all duration-300"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
                {project.screenshots.length > 1 && (
                  <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded-full">
                    +{project.screenshots.length - 1} more
                  </div>
                )}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover/image:bg-opacity-10 transition-all duration-300 rounded-lg" />
              </div>
            </div>
          )}

          {/* Technologies */}
          {project.technologies.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {project.technologies.slice(0, 5).map((tech) => (
                <span
                  key={tech}
                  className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs sm:text-sm rounded-md transition-colors cursor-default font-medium"
                >
                  {tech}
                </span>
              ))}
              {project.technologies.length > 5 && (
                <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs sm:text-sm rounded-md font-medium">
                  +{project.technologies.length - 5} more
                </span>
              )}
            </div>
          )}

          {/* AI Tools Used */}
          {project.aiTools.length > 0 && (
            <div className="mb-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Bot className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500" />
                <span className="text-xs sm:text-sm font-semibold text-gray-700">AI Tools:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {project.aiTools.slice(0, 3).map((tool) => (
                  <span
                    key={tool.name}
                    className={`px-2 py-1 text-xs sm:text-sm rounded-md transition-colors font-medium ${
                      tool.usage === 'primary' ? 'bg-blue-100 text-blue-800 hover:bg-blue-200' :
                      tool.usage === 'secondary' ? 'bg-purple-100 text-purple-800 hover:bg-purple-200' :
                      'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {tool.name}
                  </span>
                ))}
                {project.aiTools.length > 3 && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs sm:text-sm rounded-md font-medium">
                    +{project.aiTools.length - 3} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Tags */}
          {project.tags && project.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {project.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-2 py-1 bg-green-100 hover:bg-green-200 text-green-800 text-xs sm:text-sm rounded-md transition-colors cursor-default font-medium"
                >
                  <Tag className="h-3 w-3 mr-1" />
                  {tag}
                </span>
              ))}
              {project.tags.length > 3 && (
                <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs sm:text-sm rounded-md font-medium">
                  +{project.tags.length - 3} more
                </span>
              )}
            </div>
          )}

          {/* Enhanced Actions Bar */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-gray-500 pt-3 border-t border-gray-100">
            <Link
              to={`/project/${project.id}`}
              className="flex items-center gap-1.5 hover:bg-gray-100 px-2 py-1.5 rounded-lg text-sm transition-colors group/action"
            >
              <MessageCircle className="h-4 w-4 group-hover/action:text-blue-500 transition-colors" />
              <span className="group-hover/action:text-gray-700 font-medium">{project.commentCount}</span>
              <span className="hidden sm:inline group-hover/action:text-gray-700">Comments</span>
            </Link>
            
            <div className="relative">
              <button 
                onClick={() => setShowShareMenu(!showShareMenu)}
                className="flex items-center gap-1.5 hover:bg-gray-100 px-2 py-1.5 rounded-lg text-sm transition-colors group/action"
              >
                <Share className="h-4 w-4 group-hover/action:text-blue-500 transition-colors" />
                <span className="group-hover/action:text-gray-700 font-medium hidden sm:inline">Share</span>
              </button>
              
              {showShareMenu && (
                <div className="absolute bottom-full left-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-10 min-w-[180px]">
                  <button
                    onClick={() => handleShare('copy')}
                    className="flex items-center gap-2 w-full px-2 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                  >
                    <Copy className="h-4 w-4" />
                    {shareSuccess ? 'Copied!' : 'Copy Link'}
                  </button>
                  <button
                    onClick={() => handleShare('twitter')}
                    className="flex items-center gap-2 w-full px-2 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                  >
                    <Twitter className="h-4 w-4" />
                    Share on Twitter
                  </button>
                  <button
                    onClick={() => handleShare('linkedin')}
                    className="flex items-center gap-2 w-full px-2 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                  >
                    <Linkedin className="h-4 w-4" />
                    Share on LinkedIn
                  </button>
                  <button
                    onClick={() => handleShare('facebook')}
                    className="flex items-center gap-2 w-full px-2 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                  >
                    <Facebook className="h-4 w-4" />
                    Share on Facebook
                  </button>
                </div>
              )}
            </div>

            <button 
              onClick={handleSave}
              disabled={!user || isSaving}
              className={`flex items-center gap-1.5 hover:bg-gray-100 px-2 py-1.5 rounded-lg text-sm transition-colors group/action disabled:opacity-50 ${
                isSaved ? 'text-blue-600' : ''
              }`}
              title={user ? (isSaved ? 'Unsave' : 'Save') : 'Sign in to save'}
            >
              {isSaved ? <BookmarkCheck className="h-4 w-4 text-blue-600" /> : <Bookmark className="h-4 w-4 group-hover/action:text-blue-500 transition-colors" />}
              <span className="group-hover/action:text-gray-700 font-medium hidden sm:inline">
                {isSaved ? 'Saved' : 'Save'}
              </span>
            </button>
            
            {project.liveUrl && (
              <a
                href={project.liveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 hover:bg-gray-100 px-2 py-1.5 rounded-lg text-sm transition-colors group/action"
                onClick={(e) => e.stopPropagation()}
              >
                <Eye className="h-4 w-4 group-hover/action:text-green-500 transition-colors" />
                <span className="group-hover/action:text-gray-700 font-medium hidden sm:inline">Live Demo</span>
              </a>
            )}
            
            {project.githubUrl && (
              <a
                href={project.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 hover:bg-gray-100 px-2 py-1.5 rounded-lg text-sm transition-colors group/action"
                onClick={(e) => e.stopPropagation()}
              >
                <Github className="h-4 w-4 group-hover/action:text-gray-700 transition-colors" />
                <span className="group-hover/action:text-gray-700 font-medium hidden sm:inline">Code</span>
              </a>
            )}

            <button className="flex items-center gap-1 hover:bg-gray-100 px-2 py-1.5 rounded-lg text-sm transition-colors group/action ml-auto">
              <MoreHorizontal className="h-4 w-4 group-hover/action:text-gray-700 transition-colors" />
            </button>
          </div>

          {/* Trending Indicator */}
          {netVotes > 50 && (
            <div className="flex items-center gap-2 mt-2 text-sm text-orange-600">
              <TrendingUp className="h-4 w-4" />
              <span className="font-semibold">Trending</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Click outside to close share menu */}
      {showShareMenu && (
        <div 
          className="fixed inset-0 z-0" 
          onClick={() => setShowShareMenu(false)}
        />
      )}
    </article>
  );
};