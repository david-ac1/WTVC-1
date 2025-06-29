import React from 'react';
import { ArrowUp, ArrowDown, Calendar, Reply, MessageCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { Comment } from '../types';
import { votingService, commentService } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { NotificationContext } from '../App';

interface CommentBoxProps {
  comment: Comment;
  onReply?: (commentId: string) => void;
  onNewReply?: (newComment: Comment) => void;
  projectAuthor?: string;
  maxDepth?: number;
}

export const CommentBox: React.FC<CommentBoxProps> = ({ 
  comment, 
  onReply, 
  onNewReply,
  projectAuthor,
  maxDepth = 5
}) => {
  const { user } = useAuth();
  const notifications = React.useContext(NotificationContext);
  const [userVote, setUserVote] = React.useState<'up' | 'down' | null>(null);
  const [localUpvotes, setLocalUpvotes] = React.useState(comment.upvotes);
  const [localDownvotes, setLocalDownvotes] = React.useState(comment.downvotes);
  const [isVoting, setIsVoting] = React.useState(false);
  const [showReplyForm, setShowReplyForm] = React.useState(false);
  const [replyText, setReplyText] = React.useState('');
  const [submittingReply, setSubmittingReply] = React.useState(false);
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  // Determine if this comment is from the project author
  const isOP = comment.author === projectAuthor;
  const depth = comment.depth || 0;
  const canReply = depth < maxDepth;

  // Fetch user's current vote when component mounts
  React.useEffect(() => {
    const fetchUserVote = async () => {
      if (user) {
        try {
          const vote = await votingService.getUserCommentVote(comment.id, user.id);
          setUserVote(vote);
        } catch (error) {
          console.error('Error fetching user comment vote:', error);
        }
      }
    };

    fetchUserVote();
  }, [comment.id, user]);

  const handleVote = async (type: 'up' | 'down') => {
    if (!user || isVoting) return;

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
      await votingService.voteOnComment(comment.id, newVote);
    } catch (error) {
      console.error('Error voting on comment:', error);
      // Revert optimistic updates on error
      setUserVote(userVote);
      setLocalUpvotes(comment.upvotes);
      setLocalDownvotes(comment.downvotes);
    } finally {
      setIsVoting(false);
    }
  };

  const handleReplySubmit = async () => {
    if (!replyText.trim() || !user || submittingReply) return;

    try {
      setSubmittingReply(true);
      
      const newReply = await commentService.createComment({
        projectId: comment.projectId,
        content: replyText.trim(),
        parentId: comment.id
      });

      // Add depth to the new reply
      newReply.depth = depth + 1;

      // Call the callback to update the parent component
      if (onNewReply) {
        onNewReply(newReply);
      }

      setReplyText('');
      setShowReplyForm(false);
      
      // Refresh notification count after posting a reply
      if (notifications) {
        notifications.refreshNotificationCount();
      }
    } catch (error) {
      console.error('Error submitting reply:', error);
      alert('Failed to submit reply. Please try again.');
    } finally {
      setSubmittingReply(false);
    }
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

  const netVotes = localUpvotes - localDownvotes;

  return (
    <div className={`${depth > 0 ? 'ml-6 border-l-2 border-gray-200 pl-6' : ''}`}>
      <div className="glass-effect rounded-xl p-6 border border-white/20 hover:border-gray-300 transition-all duration-200 group">
        {/* Comment Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            {/* Collapse/Expand Button */}
            {comment.replies && comment.replies.length > 0 && (
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {isCollapsed ? (
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                )}
              </button>
            )}
            
            {/* Author Avatar */}
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white text-sm font-semibold shadow-sm">
              {comment.author.charAt(0).toUpperCase()}
            </div>
            
            {/* Author Info */}
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-semibold text-gray-900">{comment.author}</span>
                {isOP && (
                  <span className="px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full font-medium">
                    OP
                  </span>
                )}
                {comment.karma > 100 && (
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full font-medium">
                    {comment.karma} karma
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                <Calendar className="h-3 w-3" />
                <span>{formatDate(comment.createdAt)}</span>
                {depth > 0 && (
                  <>
                    <span>•</span>
                    <span>level {depth}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          
          {/* Vote Controls */}
          <div className="flex items-center space-x-1">
            <button
              onClick={() => handleVote('up')}
              disabled={!user || isVoting}
              className={`p-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                userVote === 'up' ? 'text-amber-500 bg-amber-50' : 'text-gray-400'
              }`}
            >
              <ArrowUp className="h-4 w-4" />
            </button>
            <span className={`text-sm font-semibold min-w-[2rem] text-center ${
              userVote === 'up' ? 'text-amber-500' : 
              userVote === 'down' ? 'text-red-500' : 'text-gray-600'
            }`}>
              {netVotes}
            </span>
            <button
              onClick={() => handleVote('down')}
              disabled={!user || isVoting}
              className={`p-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                userVote === 'down' ? 'text-red-500 bg-red-50' : 'text-gray-400'
              }`}
            >
              <ArrowDown className="h-4 w-4" />
            </button>
          </div>
        </div>
        
        {/* Comment Content */}
        {!isCollapsed && (
          <>
            <p className="text-gray-700 text-sm leading-relaxed mb-4">
              {comment.content}
            </p>

            {/* Action Buttons */}
            <div className="flex items-center space-x-4">
              {user && canReply && (
                <button
                  onClick={() => setShowReplyForm(!showReplyForm)}
                  className="flex items-center space-x-1 text-xs text-gray-500 hover:text-gray-700 transition-colors font-medium"
                >
                  <Reply className="h-3 w-3" />
                  <span>Reply</span>
                </button>
              )}
              
              {comment.replies && comment.replies.length > 0 && (
                <div className="flex items-center space-x-1 text-xs text-gray-500">
                  <MessageCircle className="h-3 w-3" />
                  <span>{comment.replies.length} repl{comment.replies.length === 1 ? 'y' : 'ies'}</span>
                </div>
              )}
              
              {!canReply && depth >= maxDepth && (
                <span className="text-xs text-gray-500">Max reply depth reached</span>
              )}
            </div>

            {/* Reply Form */}
            {showReplyForm && user && (
              <div className="mt-4 p-4 bg-gray-50/80 border border-gray-200 rounded-xl">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={`Reply to ${comment.author}...`}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
                  rows={3}
                />
                <div className="flex justify-end space-x-3 mt-3">
                  <button
                    onClick={() => {
                      setShowReplyForm(false);
                      setReplyText('');
                    }}
                    className="button-secondary text-sm"
                    disabled={submittingReply}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReplySubmit}
                    disabled={!replyText.trim() || submittingReply}
                    className="button-primary text-sm"
                  >
                    {submittingReply ? 'Posting...' : 'Reply'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Nested Replies */}
      {!isCollapsed && comment.replies && comment.replies.length > 0 && (
        <div className="mt-4 space-y-4">
          {comment.replies.map((reply) => (
            <CommentBox 
              key={reply.id} 
              comment={reply} 
              onReply={onReply}
              onNewReply={onNewReply}
              projectAuthor={projectAuthor}
              maxDepth={maxDepth}
            />
          ))}
        </div>
      )}
    </div>
  );
};