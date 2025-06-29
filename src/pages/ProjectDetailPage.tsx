import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowUp, ArrowDown, MessageCircle, ExternalLink, Github, Calendar, User, Tag, AlertCircle, Bot, CheckCircle, Trash2 } from 'lucide-react';
import { projectService, commentService, votingService } from '../lib/supabase';
import { Project, Comment } from '../types';
import { ScoreBadge } from '../components/ScoreBadge';
import { CommentBox } from '../components/CommentBox';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { useAuth } from '../context/AuthContext';
import { NotificationContext } from '../App';

export const ProjectDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const notifications = React.useContext(NotificationContext);
  const [project, setProject] = React.useState<Project | null>(null);
  const [comments, setComments] = React.useState<Comment[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [userVote, setUserVote] = React.useState<'up' | 'down' | null>(null);
  const [localUpvotes, setLocalUpvotes] = React.useState(0);
  const [localDownvotes, setLocalDownvotes] = React.useState(0);
  const [isVoting, setIsVoting] = React.useState(false);
  const [showCommentForm, setShowCommentForm] = React.useState(false);
  const [commentText, setCommentText] = React.useState('');
  const [submittingComment, setSubmittingComment] = React.useState(false);
  
  // Project deletion states
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [deletingProject, setDeletingProject] = React.useState(false);

  // Check if current user owns this project
  const isProjectOwner = user && project && user.email?.split('@')[0] === project.submittedBy;

  // Fetch project and comments
  React.useEffect(() => {
    const fetchData = async () => {
      if (!id) return;

      try {
        setLoading(true);
        setError(null);

        // Fetch project and comments in parallel
        const [projectData, commentsData] = await Promise.all([
          projectService.getProject(id),
          commentService.getProjectComments(id)
        ]);

        if (!projectData) {
          setError('Project not found');
          return;
        }

        setProject(projectData);
        setComments(commentsData);
        setLocalUpvotes(projectData.upvotes);
        setLocalDownvotes(projectData.downvotes);

        // Fetch user's vote if authenticated
        if (user) {
          try {
            const vote = await votingService.getUserProjectVote(id, user.id);
            setUserVote(vote);
          } catch (voteError) {
            console.error('Error fetching user vote:', voteError);
          }
        }
      } catch (err) {
        console.error('Error fetching project data:', err);
        setError('Failed to load project. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, user]);

  const handleVote = async (type: 'up' | 'down') => {
    if (!project || !user || isVoting) return;

    try {
      setIsVoting(true);
      
      const newVote = userVote === type ? null : type;
      
      // Optimistically update the UI
      const prevVote = userVote;
      setUserVote(newVote);
      
      // Calculate new vote counts
      let newUpvotes = localUpvotes;
      let newDownvotes = localDownvotes;
      
      // Remove previous vote
      if (prevVote === 'up') newUpvotes--;
      if (prevVote === 'down') newDownvotes--;
      
      // Add new vote
      if (newVote === 'up') newUpvotes++;
      if (newVote === 'down') newDownvotes++;
      
      setLocalUpvotes(newUpvotes);
      setLocalDownvotes(newDownvotes);

      // Submit vote to backend
      await votingService.voteOnProject(project.id, newVote);
      
      // Show success notification
      if (notifications) {
        const voteAction = newVote ? `${newVote}voted` : 'removed vote from';
        notifications.showSuccess(
          'Vote Updated',
          `Successfully ${voteAction} project "${project.title}"`
        );
      }
    } catch (error) {
      console.error('Error voting on project:', error);
      // Revert optimistic updates on error
      setUserVote(userVote);
      setLocalUpvotes(localUpvotes);
      setLocalDownvotes(localDownvotes);
      
      if (notifications) {
        notifications.showError(
          'Vote Failed',
          'Failed to update your vote. Please try again.'
        );
      }
    } finally {
      setIsVoting(false);
    }
  };

  const handleCommentSubmit = async () => {
    if (!commentText.trim() || !project || !user) return;

    try {
      setSubmittingComment(true);
      
      const newComment = await commentService.createComment({
        projectId: project.id,
        content: commentText.trim()
      });

      // Add the new comment to the list (it will be a root comment)
      setComments(prev => [...prev, newComment]);
      setCommentText('');
      setShowCommentForm(false);
      
      if (notifications) {
        notifications.showSuccess(
          'Comment Posted',
          'Your comment has been added successfully'
        );
        
        // Refresh notification count to update the navbar
        notifications.refreshNotificationCount();
      }
    } catch (err) {
      console.error('Error submitting comment:', err);
      if (notifications) {
        notifications.showError(
          'Comment Failed',
          'Failed to post your comment. Please try again.'
        );
      }
    } finally {
      setSubmittingComment(false);
    }
  };

  // Handle new replies from nested comments
  const handleNewReply = (newReply: Comment) => {
    // Find the parent comment and add the reply
    const addReplyToComment = (comments: Comment[], parentId: string, reply: Comment): Comment[] => {
      return comments.map(comment => {
        if (comment.id === parentId) {
          return {
            ...comment,
            replies: [...(comment.replies || []), reply]
          };
        } else if (comment.replies && comment.replies.length > 0) {
          return {
            ...comment,
            replies: addReplyToComment(comment.replies, parentId, reply)
          };
        }
        return comment;
      });
    };

    if (newReply.parentId) {
      setComments(prev => addReplyToComment(prev, newReply.parentId!, newReply));
      
      // Refresh notification count when a reply is posted
      if (notifications) {
        notifications.refreshNotificationCount();
      }
    }
  };

  const handleDeleteProject = async () => {
    if (!project || !user || !isProjectOwner) return;

    try {
      setDeletingProject(true);
      
      await projectService.deleteProject(project.id);
      
      if (notifications) {
        notifications.showSuccess(
          'Project Deleted',
          `"${project.title}" has been permanently deleted`
        );
      }
      
      // Navigate back to home page
      navigate('/');
    } catch (error) {
      console.error('Error deleting project:', error);
      if (notifications) {
        notifications.showError(
          'Delete Failed',
          'Failed to delete the project. Please try again.'
        );
      }
    } finally {
      setDeletingProject(false);
      setShowDeleteModal(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          {/* Header Skeleton */}
          <div className="mb-8">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
              <div className="flex-1">
                <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-6 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-6 bg-gray-200 rounded w-2/3 mb-6"></div>
                <div className="flex space-x-2 mb-6">
                  <div className="h-6 bg-gray-200 rounded w-16"></div>
                  <div className="h-6 bg-gray-200 rounded w-20"></div>
                  <div className="h-6 bg-gray-200 rounded w-14"></div>
                </div>
              </div>
              <div className="flex flex-col items-center space-y-4">
                <div className="h-10 bg-gray-200 rounded w-32"></div>
                <div className="h-12 bg-gray-200 rounded w-24"></div>
              </div>
            </div>
          </div>

          {/* Analysis Section Skeleton */}
          <div className="bg-gray-100 rounded-xl p-6 mb-8">
            <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>

          {/* Comments Section Skeleton */}
          <div className="space-y-6">
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-gray-100 rounded-lg p-4">
                  <div className="h-4 bg-gray-200 rounded w-1/4 mb-3"></div>
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

  if (error || !project) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center space-x-3">
            <AlertCircle className="h-6 w-6 text-red-500" />
            <div>
              <h3 className="text-lg font-medium text-red-900">
                {error || 'Project Not Found'}
              </h3>
              <p className="text-red-700">
                {error || "This project doesn't exist or has been removed."}
              </p>
              <div className="mt-4 space-x-3">
                <Link
                  to="/"
                  className="inline-flex items-center px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm rounded-lg transition-colors"
                >
                  Back to Projects
                </Link>
                <button
                  onClick={() => window.location.reload()}
                  className="inline-flex items-center px-4 py-2 border border-red-300 hover:border-red-400 text-red-700 text-sm rounded-lg transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-2 text-sm text-slate-400 mb-4">
          <Link to="/" className="hover:text-blue-400 transition-colors">Projects</Link>
          <span>/</span>
          <span className="text-slate-300">{project.repoName || project.title}</span>
        </div>
        
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-4">
              <h1 className="text-3xl font-bold text-white">{project.title}</h1>
              {project.githubUrl && (
                <a
                  href={project.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors"
                >
                  <Github className="h-4 w-4 mr-1" />
                  View on GitHub
                  <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              )}
              
              {/* Delete Button for Project Owner */}
              {isProjectOwner && (
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="inline-flex items-center px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete Project
                </button>
              )}
            </div>
            
            <p className="text-lg text-slate-300 mb-6 leading-relaxed">
              {project.description}
            </p>
            
            {project.tags && project.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {project.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-3 py-1 bg-slate-700 text-slate-300 text-sm rounded-full"
                  >
                    <Tag className="h-3 w-3 mr-1" />
                    {tag}
                  </span>
                ))}
              </div>
            )}
            
            <div className="flex items-center space-x-6 text-sm text-slate-400">
              <div className="flex items-center space-x-1">
                <User className="h-4 w-4" />
                <span>Submitted by <span className="text-slate-300">{project.submittedBy}</span></span>
              </div>
              <div className="flex items-center space-x-1">
                <Calendar className="h-4 w-4" />
                <span>{formatDate(project.submittedAt)}</span>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col items-center lg:items-end space-y-4">
            <ScoreBadge score={project.vciScore} size="large" />
            
            {/* Voting */}
            {user && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleVote('up')}
                  disabled={isVoting}
                  className={`p-2 rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    userVote === 'up'
                      ? 'bg-amber-500 border-amber-500 text-white'
                      : 'border-slate-600 text-slate-400 hover:border-amber-500 hover:text-amber-400'
                  }`}
                >
                  <ArrowUp className="h-5 w-5" />
                </button>
                <span className="text-lg font-medium text-white min-w-[3rem] text-center">
                  {localUpvotes - localDownvotes}
                </span>
                <button
                  onClick={() => handleVote('down')}
                  disabled={isVoting}
                  className={`p-2 rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    userVote === 'down'
                      ? 'bg-red-500 border-red-500 text-white'
                      : 'border-slate-600 text-slate-400 hover:border-red-500 hover:text-red-400'
                  }`}
                >
                  <ArrowDown className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI Analysis Section */}
      {project.analysis && (
        <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
            <div className="w-2 h-2 bg-blue-400 rounded-full mr-3"></div>
            AI Analysis
            {project.confidence && (
              <span className="ml-3 text-sm text-slate-400">
                Confidence: {project.confidence}%
              </span>
            )}
          </h2>
          <p className="text-slate-300 leading-relaxed mb-4">
            {project.analysis}
          </p>
          
          {/* Detailed Indicators */}
          {project.indicators && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              {project.indicators.codePatterns.length > 0 && (
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-blue-400 mb-2 flex items-center">
                    <Bot className="h-4 w-4 mr-1" />
                    Code Patterns
                  </h4>
                  <ul className="space-y-1">
                    {project.indicators.codePatterns.slice(0, 3).map((pattern, index) => (
                      <li key={index} className="text-xs text-slate-400 flex items-start">
                        <CheckCircle className="h-3 w-3 text-blue-400 mr-1 mt-0.5 flex-shrink-0" />
                        {pattern}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {project.indicators.commitPatterns.length > 0 && (
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-green-400 mb-2 flex items-center">
                    <Github className="h-4 w-4 mr-1" />
                    Commit Patterns
                  </h4>
                  <ul className="space-y-1">
                    {project.indicators.commitPatterns.slice(0, 3).map((pattern, index) => (
                      <li key={index} className="text-xs text-slate-400 flex items-start">
                        <CheckCircle className="h-3 w-3 text-green-400 mr-1 mt-0.5 flex-shrink-0" />
                        {pattern}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {project.indicators.documentationPatterns.length > 0 && (
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-purple-400 mb-2 flex items-center">
                    <MessageCircle className="h-4 w-4 mr-1" />
                    Documentation
                  </h4>
                  <ul className="space-y-1">
                    {project.indicators.documentationPatterns.slice(0, 3).map((pattern, index) => (
                      <li key={index} className="text-xs text-slate-400 flex items-start">
                        <CheckCircle className="h-3 w-3 text-purple-400 mr-1 mt-0.5 flex-shrink-0" />
                        {pattern}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Comments Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white flex items-center">
            <MessageCircle className="h-5 w-5 mr-2" />
            Discussion ({comments.length})
          </h2>
          {user && (
            <button
              onClick={() => setShowCommentForm(!showCommentForm)}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Add Comment
            </button>
          )}
        </div>

        {/* Comment Form */}
        {showCommentForm && user && (
          <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-4">
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Share your thoughts about this project's AI vs human patterns..."
              className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={3}
            />
            <div className="flex justify-end space-x-3 mt-3">
              <button
                onClick={() => {
                  setShowCommentForm(false);
                  setCommentText('');
                }}
                className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                disabled={submittingComment}
              >
                Cancel
              </button>
              <button
                onClick={handleCommentSubmit}
                disabled={!commentText.trim() || submittingComment}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {submittingComment ? 'Posting...' : 'Post Comment'}
              </button>
            </div>
          </div>
        )}

        {/* Login prompt for non-authenticated users */}
        {!user && (
          <div className="bg-slate-800/20 border border-slate-700 rounded-lg p-4 text-center">
            <p className="text-slate-400 mb-3">
              <Link to="/login" className="text-blue-400 hover:text-blue-300">
                Sign in
              </Link> to join the discussion
            </p>
          </div>
        )}

        {/* Comments List */}
        <div className="space-y-4">
          {comments.length > 0 ? (
            comments.map((comment) => (
              <CommentBox 
                key={comment.id} 
                comment={comment} 
                onNewReply={handleNewReply}
                projectAuthor={project.submittedBy}
                maxDepth={5}
              />
            ))
          ) : (
            <div className="text-center py-12 bg-slate-800/20 border border-slate-700 rounded-lg">
              <MessageCircle className="h-12 w-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">No comments yet. Be the first to share your thoughts!</p>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteProject}
        title="Delete Project"
        message={`Are you sure you want to permanently delete "${project.title}"? This action cannot be undone and will remove all associated comments and votes.`}
        confirmText="Delete Project"
        cancelText="Cancel"
        type="danger"
        loading={deletingProject}
      />
    </div>
  );
};