import { supabase } from '../context/AuthContext';
import { Project, Comment, User, CommunityStats, PopularAiTool } from '../types';

// Notification interface
export interface Notification {
  id: string;
  recipient_id: string;
  sender_id: string | null;
  type: 'project_upvote' | 'project_downvote' | 'project_comment' | 'comment_reply' | 'comment_upvote' | 'comment_downvote';
  entity_id: string;
  entity_type: 'project' | 'comment';
  message: string;
  link: string;
  is_read: boolean;
  created_at: string;
  sender_username?: string;
}

// Voting operations
export const votingService = {
  // Get user's vote for a project
  async getUserProjectVote(projectId: string, userId: string): Promise<'up' | 'down' | null> {
    const { data, error } = await supabase
      .from('project_votes')
      .select('vote_type')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .limit(1);

    if (error) {
      console.error('Error fetching user project vote:', error);
      return null;
    }

    return data?.[0]?.vote_type || null;
  },

  // Vote on a project
  async voteOnProject(projectId: string, voteType: 'up' | 'down' | null): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated to vote');
    }

    if (voteType === null) {
      // Remove vote
      const { error } = await supabase
        .from('project_votes')
        .delete()
        .eq('project_id', projectId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error removing project vote:', error);
        throw error;
      }
    } else {
      // Insert or update vote
      const { error } = await supabase
        .from('project_votes')
        .upsert({
          project_id: projectId,
          user_id: user.id,
          vote_type: voteType
        }, {
          onConflict: 'project_id,user_id'
        });

      if (error) {
        console.error('Error voting on project:', error);
        throw error;
      }
    }
  },

  // Get user's vote for a comment
  async getUserCommentVote(commentId: string, userId: string): Promise<'up' | 'down' | null> {
    const { data, error } = await supabase
      .from('comment_votes')
      .select('vote_type')
      .eq('comment_id', commentId)
      .eq('user_id', userId)
      .limit(1);

    if (error) {
      console.error('Error fetching user comment vote:', error);
      return null;
    }

    return data?.[0]?.vote_type || null;
  },

  // Vote on a comment
  async voteOnComment(commentId: string, voteType: 'up' | 'down' | null): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated to vote');
    }

    if (voteType === null) {
      // Remove vote
      const { error } = await supabase
        .from('comment_votes')
        .delete()
        .eq('comment_id', commentId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error removing comment vote:', error);
        throw error;
      }
    } else {
      // Insert or update vote
      const { error } = await supabase
        .from('comment_votes')
        .upsert({
          comment_id: commentId,
          user_id: user.id,
          vote_type: voteType
        }, {
          onConflict: 'comment_id,user_id'
        });

      if (error) {
        console.error('Error voting on comment:', error);
        throw error;
      }
    }
  }
};

// Notification operations
export const notificationService = {
  // Get notifications for the current user
  async getNotifications(limit: number = 20, offset: number = 0): Promise<Notification[]> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated to get notifications');
    }

    const { data, error } = await supabase
      .from('notifications')
      .select(`
        *,
        sender:sender_id (
          username
        )
      `)
      .eq('recipient_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }

    return (data || []).map(notification => ({
      ...notification,
      sender_username: notification.sender?.username || 'Unknown User'
    }));
  },

  // Get unread notification count
  async getUnreadCount(): Promise<number> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return 0;
    }

    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', user.id)
      .eq('is_read', false);

    if (error) {
      console.error('Error fetching unread count:', error);
      return 0;
    }

    return count || 0;
  },

  // Mark notifications as read
  async markAsRead(notificationIds: string[]): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated to mark notifications as read');
    }

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .in('id', notificationIds)
      .eq('recipient_id', user.id);

    if (error) {
      console.error('Error marking notifications as read:', error);
      throw error;
    }
  },

  // Mark all notifications as read
  async markAllAsRead(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated to mark notifications as read');
    }

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('recipient_id', user.id)
      .eq('is_read', false);

    if (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  },

  // Delete a notification
  async deleteNotification(notificationId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated to delete notifications');
    }

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)
      .eq('recipient_id', user.id);

    if (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }
};

// Stats operations for sidebar
export const statsService = {
  // Get community statistics
  async getCommunityStats(): Promise<CommunityStats> {
    try {
      // Get total projects count
      const { count: totalProjects, error: totalError } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true });

      if (totalError) {
        console.error('Error fetching total projects:', totalError);
        throw totalError;
      }

      // Get AI-assisted projects count (VCI >= 60)
      const { count: aiAssistedProjects, error: aiError } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .gte('vci_score', 60);

      if (aiError) {
        console.error('Error fetching AI-assisted projects:', aiError);
        throw aiError;
      }

      // Get verified projects count
      const { count: verifiedProjects, error: verifiedError } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('is_verified', true);

      if (verifiedError) {
        console.error('Error fetching verified projects:', verifiedError);
        throw verifiedError;
      }

      // Get active developers count (distinct users who have submitted projects)
      const { count: activeDevelopers, error: developersError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gt('projects_submitted', 0);

      if (developersError) {
        console.error('Error fetching active developers:', developersError);
        throw developersError;
      }

      return {
        totalProjects: totalProjects || 0,
        aiAssistedProjects: aiAssistedProjects || 0,
        verifiedProjects: verifiedProjects || 0,
        activeDevelopers: activeDevelopers || 0
      };
    } catch (error) {
      console.error('Error fetching community stats:', error);
      // Return fallback data
      return {
        totalProjects: 0,
        aiAssistedProjects: 0,
        verifiedProjects: 0,
        activeDevelopers: 0
      };
    }
  },

  // Get popular AI tools
  async getPopularAiTools(): Promise<PopularAiTool[]> {
    try {
      // Fetch all projects with their AI tools
      const { data: projects, error } = await supabase
        .from('projects')
        .select('ai_tools')
        .not('ai_tools', 'is', null);

      if (error) {
        console.error('Error fetching projects for AI tools:', error);
        throw error;
      }

      if (!projects || projects.length === 0) {
        return [];
      }

      // Count AI tool usage
      const toolCounts = new Map<string, number>();
      let totalToolUsages = 0;

      projects.forEach(project => {
        if (project.ai_tools && Array.isArray(project.ai_tools)) {
          project.ai_tools.forEach((tool: any) => {
            const toolName = typeof tool === 'string' ? tool : tool.name;
            if (toolName) {
              toolCounts.set(toolName, (toolCounts.get(toolName) || 0) + 1);
              totalToolUsages++;
            }
          });
        }
      });

      // Convert to array and calculate percentages
      const popularTools: PopularAiTool[] = Array.from(toolCounts.entries())
        .map(([name, count]) => ({
          name,
          count,
          percentage: totalToolUsages > 0 ? Math.round((count / totalToolUsages) * 100) : 0
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6); // Top 6 tools

      return popularTools;
    } catch (error) {
      console.error('Error fetching popular AI tools:', error);
      // Return fallback data
      return [
        { name: 'GitHub Copilot', count: 0, percentage: 0 },
        { name: 'ChatGPT', count: 0, percentage: 0 },
        { name: 'Claude', count: 0, percentage: 0 },
        { name: 'Cursor', count: 0, percentage: 0 }
      ];
    }
  }
};

// Search operations
// Fixed Search Service - Server-side + Client-side hybrid approach
export const searchService = {
  async searchProjects(options: {
    query: string;
    sortBy?: 'relevance' | 'recent' | 'vci-high' | 'vci-low' | 'trending';
    filters?: {
      vciRange?: 'all' | 'low' | 'medium' | 'high';
      verified?: 'all' | 'verified' | 'unverified';
      hasAiTools?: 'all' | 'yes' | 'no';
    };
    limit?: number;
    offset?: number;
  }): Promise<Project[]> {
    const { query, sortBy = 'relevance', filters = {}, limit = 50, offset = 0 } = options;
    
    let supabaseQuery = supabase
      .from('projects')
      .select(`
        *,
        profiles:submitted_by (
          username,
          avatar_url
        )
      `);

    // Apply text search using PostgreSQL text search
    if (query.trim()) {
      const searchTerm = `%${query.trim()}%`;
      const orClause = [
        `title.ilike.${searchTerm}`,
        `description.ilike.${searchTerm}`,
        `repo_name.ilike.${searchTerm}`
      ].join(',');
      supabaseQuery = supabaseQuery.or(orClause);
    }

    // Apply filters
    if (filters.vciRange && filters.vciRange !== 'all') {
      switch (filters.vciRange) {
        case 'low':
          supabaseQuery = supabaseQuery.lt('vci_score', 40);
          break;
        case 'medium':
          supabaseQuery = supabaseQuery.gte('vci_score', 40).lt('vci_score', 80);
          break;
        case 'high':
          supabaseQuery = supabaseQuery.gte('vci_score', 80);
          break;
      }
    }

    if (filters.verified && filters.verified !== 'all') {
      supabaseQuery = supabaseQuery.eq('is_verified', filters.verified === 'verified');
    }

    // Apply sorting
    switch (sortBy) {
      case 'recent':
        supabaseQuery = supabaseQuery.order('created_at', { ascending: false });
        break;
      case 'vci-high':
        supabaseQuery = supabaseQuery.order('vci_score', { ascending: false });
        break;
      case 'vci-low':
        supabaseQuery = supabaseQuery.order('vci_score', { ascending: true });
        break;
      case 'trending':
        supabaseQuery = supabaseQuery.order('upvotes', { ascending: false });
        break;
      default: // relevance
        if (query.trim()) {
          supabaseQuery = supabaseQuery.order('created_at', { ascending: false });
        } else {
          supabaseQuery = supabaseQuery.order('upvotes', { ascending: false });
        }
        break;
    }

    // Apply pagination
    if (offset) {
      supabaseQuery = supabaseQuery.range(offset, offset + limit - 1);
    } else if (limit) {
      supabaseQuery = supabaseQuery.limit(limit);
    }

    const { data, error } = await supabaseQuery;

    if (error) {
      console.error('Error searching projects:', error);
      throw error;
    }

    // Transform results
    let results = data?.map(transformProjectFromDB) || [];

    // Apply AI tools filter (client-side for now since it's complex JSONB filtering)
    if (filters.hasAiTools && filters.hasAiTools !== 'all') {
      results = results.filter(project => {
        const hasAiTools = project.aiTools && project.aiTools.length > 0;
        return filters.hasAiTools === 'yes' ? hasAiTools : !hasAiTools;
      });
    }

    if (query.trim()) {
      const searchTerm = query.toLowerCase();
      
      results = results.filter(project => {
        const matchesServerSide = 
          project.title.toLowerCase().includes(searchTerm) ||
          project.description.toLowerCase().includes(searchTerm) ||
          (project.repoName && project.repoName.toLowerCase().includes(searchTerm));
        
        if (matchesServerSide) {
          return true;
        }
        
        const matchesTechnologies = project.technologies.some(tech => 
          tech.toLowerCase().includes(searchTerm)
        );
        const matchesAiTools = project.aiTools.some(tool => 
          tool.name.toLowerCase().includes(searchTerm)
        );
        const matchesTags = project.tags?.some(tag => 
          tag.toLowerCase().includes(searchTerm)
        ) || false;
        const matchesAuthor = project.submittedBy.toLowerCase().includes(searchTerm);

        return matchesTechnologies || matchesAiTools || matchesTags || matchesAuthor;
      });
    }

    return results;
  },

  // Alternative simplified approach - removes problematic client-side override
  async searchProjectsSimple(options: {
    query: string;
    sortBy?: 'relevance' | 'recent' | 'vci-high' | 'vci-low' | 'trending';
    filters?: {
      vciRange?: 'all' | 'low' | 'medium' | 'high';
      verified?: 'all' | 'verified' | 'unverified';
      hasAiTools?: 'all' | 'yes' | 'no';
    };
    limit?: number;
    offset?: number;
  }): Promise<Project[]> {
    const { query, sortBy = 'relevance', filters = {}, limit = 50, offset = 0 } = options;
    
    let supabaseQuery = supabase
      .from('projects')
      .select(`
        *,
        profiles:submitted_by (
          username,
          avatar_url
        )
      `);

    // Apply text search
    if (query.trim()) {
      const searchTerm = `%${query.trim()}%`;
      const orClause = [
        `title.ilike.${searchTerm}`,
        `description.ilike.${searchTerm}`,
        `repo_name.ilike.${searchTerm}`
      ].join(',');
      supabaseQuery = supabaseQuery.or(orClause);
    }

    // Apply filters
    if (filters.vciRange && filters.vciRange !== 'all') {
      switch (filters.vciRange) {
        case 'low':
          supabaseQuery = supabaseQuery.lt('vci_score', 40);
          break;
        case 'medium':
          supabaseQuery = supabaseQuery.gte('vci_score', 40).lt('vci_score', 80);
          break;
        case 'high':
          supabaseQuery = supabaseQuery.gte('vci_score', 80);
          break;
      }
    }

    if (filters.verified && filters.verified !== 'all') {
      supabaseQuery = supabaseQuery.eq('is_verified', filters.verified === 'verified');
    }

    // Apply sorting
    switch (sortBy) {
      case 'recent':
        supabaseQuery = supabaseQuery.order('created_at', { ascending: false });
        break;
      case 'vci-high':
        supabaseQuery = supabaseQuery.order('vci_score', { ascending: false });
        break;
      case 'vci-low':
        supabaseQuery = supabaseQuery.order('vci_score', { ascending: true });
        break;
      case 'trending':
        supabaseQuery = supabaseQuery.order('upvotes', { ascending: false });
        break;
      default:
        if (query.trim()) {
          supabaseQuery = supabaseQuery.order('created_at', { ascending: false });
        } else {
          supabaseQuery = supabaseQuery.order('upvotes', { ascending: false });
        }
        break;
    }

    // Apply pagination
    if (offset) {
      supabaseQuery = supabaseQuery.range(offset, offset + limit - 1);
    } else if (limit) {
      supabaseQuery = supabaseQuery.limit(limit);
    }

    const { data, error } = await supabaseQuery;

    if (error) {
      console.error('Error searching projects:', error);
      throw error;
    }

    // Transform results and apply AI tools filter only
    let results = data?.map(transformProjectFromDB) || [];

    if (filters.hasAiTools && filters.hasAiTools !== 'all') {
      results = results.filter(project => {
        const hasAiTools = project.aiTools && project.aiTools.length > 0;
        return filters.hasAiTools === 'yes' ? hasAiTools : !hasAiTools;
      });
    }

    return results;
  },

  // Keep the existing suggestions function
  async getSearchSuggestions(query: string, limit: number = 5): Promise<string[]> {
    if (!query.trim()) return [];

    try {
      const { data: projects, error } = await supabase
        .from('projects')
        .select('technologies, ai_tools, tags')
        .limit(100);

      if (error) {
        console.error('Error fetching search suggestions:', error);
        return [];
      }

      const suggestions = new Set<string>();
      const searchTerm = query.toLowerCase();

      projects?.forEach(project => {
        if (project.technologies) {
          project.technologies.forEach((tech: string) => {
            if (tech.toLowerCase().includes(searchTerm)) {
              suggestions.add(tech);
            }
          });
        }

        if (project.ai_tools) {
          project.ai_tools.forEach((tool: any) => {
            const toolName = typeof tool === 'string' ? tool : tool.name;
            if (toolName && toolName.toLowerCase().includes(searchTerm)) {
              suggestions.add(toolName);
            }
          });
        }

        if (project.tags) {
          project.tags.forEach((tag: string) => {
            if (tag.toLowerCase().includes(searchTerm)) {
              suggestions.add(tag);
            }
          });
        }
      });

      return Array.from(suggestions).slice(0, limit);
    } catch (error) {
      console.error('Error getting search suggestions:', error);
      return [];
    }
  }
};

// Project operations
export const projectService = {
  // Fetch all projects with optional filtering and sorting
  async getProjects(options?: {
    sortBy?: 'trending' | 'recent' | 'vci-high' | 'vci-low' | 'controversial';
    filterBy?: 'all' | 'verified' | 'unverified' | 'high-ai' | 'low-ai';
    limit?: number;
    offset?: number;
  }) {
    let query = supabase
      .from('projects')
      .select(`
        *,
        profiles:submitted_by (
          username,
          avatar_url
        )
      `);

    // Apply filters
    if (options?.filterBy) {
      switch (options.filterBy) {
        case 'verified':
          query = query.eq('is_verified', true);
          break;
        case 'unverified':
          query = query.eq('is_verified', false);
          break;
        case 'high-ai':
          query = query.gte('vci_score', 70);
          break;
        case 'low-ai':
          query = query.lt('vci_score', 40);
          break;
      }
    }

    // Apply sorting
    if (options?.sortBy) {
      switch (options.sortBy) {
        case 'recent':
          query = query.order('created_at', { ascending: false });
          break;
        case 'vci-high':
          query = query.order('vci_score', { ascending: false });
          break;
        case 'vci-low':
          query = query.order('vci_score', { ascending: true });
          break;
        case 'controversial':
          // For controversial, we'll need to calculate the ratio on the client side
          query = query.order('created_at', { ascending: false });
          break;
        case 'trending':
        default:
          // For trending, we'll order by upvotes - downvotes
          query = query.order('upvotes', { ascending: false });
          break;
      }
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching projects:', error);
      throw error;
    }

    // Transform the data to match our Project interface
    return data?.map(transformProjectFromDB) || [];
  },

  // Fetch a single project by ID
  async getProject(id: string) {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        profiles:submitted_by (
          username,
          avatar_url
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching project:', error);
      throw error;
    }

    return data ? transformProjectFromDB(data) : null;
  },

  // Create a new project
  async createProject(projectData: Omit<Project, 'id' | 'submittedAt' | 'upvotes' | 'downvotes' | 'commentCount'>) {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated to create a project');
    }

    // Ensure the user has a profile before creating a project
    await ensureUserProfile(user);

    const dbProject = transformProjectToDB(projectData, user.id);

    const { data, error } = await supabase
      .from('projects')
      .insert([dbProject])
      .select(`
        *,
        profiles:submitted_by (
          username,
          avatar_url
        )
      `)
      .single();

    if (error) {
      console.error('Error creating project:', error);
      throw error;
    }

    return transformProjectFromDB(data);
  },

  // Delete a project
  async deleteProject(projectId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated to delete a project');
    }

    // First, verify that the user owns this project
    const { data: project, error: fetchError } = await supabase
      .from('projects')
      .select('submitted_by')
      .eq('id', projectId)
      .single();

    if (fetchError) {
      console.error('Error fetching project for deletion:', fetchError);
      throw new Error('Project not found');
    }

    if (project.submitted_by !== user.id) {
      throw new Error('You can only delete your own projects');
    }

    // Delete the project (cascading deletes will handle related data)
    const { error: deleteError } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId);

    if (deleteError) {
      console.error('Error deleting project:', deleteError);
      throw deleteError;
    }
  },

  // Update project votes (deprecated - use votingService instead)
  async updateProjectVotes(projectId: string, upvotes: number, downvotes: number) {
    const { data, error } = await supabase
      .from('projects')
      .update({ upvotes, downvotes })
      .eq('id', projectId)
      .select(`
        *,
        profiles:submitted_by (
          username,
          avatar_url
        )
      `)
      .single();

    if (error) {
      console.error('Error updating project votes:', error);
      throw error;
    }

    return transformProjectFromDB(data);
  }
};

// Comment operations
export const commentService = {
  // Fetch comments for a project with nested structure
  async getProjectComments(projectId: string): Promise<Comment[]> {
    const { data, error } = await supabase
      .from('comments')
      .select(`
        *,
        profiles:author_id (
          username,
          avatar_url
        )
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching comments:', error);
      throw error;
    }

    const comments = data?.map(transformCommentFromDB) || [];
    
    // Build nested comment structure
    return buildCommentTree(comments);
  },

  // Create a new comment
  async createComment(commentData: {
    projectId: string;
    content: string;
    parentId?: string;
  }) {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated to create a comment');
    }

    // Ensure the user has a profile before creating a comment
    await ensureUserProfile(user);

    const { data, error } = await supabase
      .from('comments')
      .insert([{
        project_id: commentData.projectId,
        author_id: user.id,
        content: commentData.content,
        parent_id: commentData.parentId || null,
        upvotes: 0,
        downvotes: 0,
        karma: 0
      }])
      .select(`
        *,
        profiles:author_id (
          username,
          avatar_url
        )
      `)
      .single();

    if (error) {
      console.error('Error creating comment:', error);
      throw error;
    }

    return transformCommentFromDB(data);
  }
};

// User operations
export const userService = {
  // Get user profile
  async getUserProfile(username: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .maybeSingle();

    if (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }

    return data ? transformUserFromDB(data) : null;
  },

  // Get projects by user
  async getUserProjects(username: string) {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        profiles:submitted_by!inner (
          username,
          avatar_url
        )
      `)
      .eq('profiles.username', username);

    if (error) {
      console.error('Error fetching user projects:', error);
      throw error;
    }

    return data?.map(transformProjectFromDB) || [];
  }
};

// Helper function to build comment tree structure
function buildCommentTree(comments: Comment[]): Comment[] {
  const commentMap = new Map<string, Comment>();
  const rootComments: Comment[] = [];

  // First pass: create a map of all comments
  comments.forEach(comment => {
    comment.replies = [];
    comment.depth = 0;
    commentMap.set(comment.id, comment);
  });

  // Second pass: build the tree structure
  comments.forEach(comment => {
    if (comment.parentId) {
      const parent = commentMap.get(comment.parentId);
      if (parent) {
        comment.depth = (parent.depth || 0) + 1;
        parent.replies!.push(comment);
      } else {
        // Parent not found, treat as root comment
        rootComments.push(comment);
      }
    } else {
      rootComments.push(comment);
    }
  });

  return rootComments;
}

// Helper function to ensure user profile exists
async function ensureUserProfile(user: any) {
  try {
    // Check if profile exists
    let existingProfile = null;
    let fetchError = null;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();
      
      existingProfile = data;
      fetchError = error;
    } catch (error: any) {
      // Handle the specific case where no profile is found
      if (error.code === 'PGRST116') {
        // No profile found - this is expected, continue to create one
        existingProfile = null;
        fetchError = null;
      } else {
        // Some other error occurred
        throw error;
      }
    }

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 is "not found" error
      console.error('Error checking for existing profile:', fetchError);
      return;
    }

    if (existingProfile) {
      return; // Profile already exists
    }

    // Create profile if it doesn't exist
    const username = user.user_metadata?.username || 
                    user.email?.split('@')[0] || 
                    `user_${user.id.slice(0, 8)}`;

    const { error: insertError } = await supabase
      .from('profiles')
      .insert([{
        id: user.id,
        username: username,
        avatar_url: user.user_metadata?.avatar_url || null,
        karma: 0,
        projects_submitted: 0,
        joined_at: new Date().toISOString(),
        specialization: null,
        ai_tools_used: []
      }]);

    if (insertError) {
      console.error('Error creating profile:', insertError);
      
      // If username conflict, try with a suffix
      if (insertError.code === '23505') {
        const uniqueUsername = `${username}_${Date.now()}`;
        const { error: retryError } = await supabase
          .from('profiles')
          .insert([{
            id: user.id,
            username: uniqueUsername,
            avatar_url: user.user_metadata?.avatar_url || null,
            karma: 0,
            projects_submitted: 0,
            joined_at: new Date().toISOString(),
            specialization: null,
            ai_tools_used: []
          }]);
        
        if (retryError) {
          console.error('Error creating profile with unique username:', retryError);
          throw retryError;
        }
      } else {
        throw insertError;
      }
    }
  } catch (error) {
    console.error('Error ensuring user profile:', error);
    throw error;
  }
}

// Transform functions to convert between DB format and our interfaces
function transformProjectFromDB(dbProject: any): Project {
  return {
    id: dbProject.id,
    title: dbProject.title,
    description: dbProject.description || '',
    repoName: dbProject.repo_name || extractRepoName(dbProject.github_url || ''),
    githubUrl: dbProject.github_url,
    liveUrl: dbProject.live_url,
    screenshots: dbProject.screenshots || [],
    technologies: dbProject.technologies || [],
    tags: dbProject.tags || [],
    aiTools: dbProject.ai_tools || [],
    vciScore: dbProject.vci_score || 50,
    aiVibeScore: dbProject.vci_score || 50, 
    // For backward compatibility
    communityVciScore: dbProject.community_vci_score,
    submittedBy: dbProject.profiles?.username || 'unknown',
    submittedAt: new Date(dbProject.submitted_at || dbProject.created_at),
    upvotes: dbProject.upvotes || 0,
    downvotes: dbProject.downvotes || 0,
    commentCount: dbProject.comment_count || 0,
    isVerified: dbProject.is_verified || false,
    analysis: dbProject.analysis,
    confidence: dbProject.confidence,
    indicators: dbProject.indicators,
    developmentProcess: {
      totalHours: 0, // Default values since these columns don't exist in DB
      aiAssistedHours: 0,
      manualHours: 0,
      challenges: dbProject.development_process?.challenges || [],
      learnings: dbProject.development_process?.learnings || []
    },
    prompts: dbProject.prompts || [],
    codeBreakdown: {
      aiGenerated: dbProject.code_breakdown?.aiGenerated || 0,
      aiModified: dbProject.code_breakdown?.aiModified || 0,
      humanWritten: dbProject.code_breakdown?.humanWritten || 100
    }
  };
}

function transformProjectToDB(project: Omit<Project, 'id' | 'submittedAt' | 'upvotes' | 'downvotes' | 'commentCount'>, userId: string) {
  return {
    title: project.title,
    description: project.description,
    repo_name: project.repoName,
    github_url: project.githubUrl,
    live_url: project.liveUrl,
    screenshots: project.screenshots,
    technologies: project.technologies,
    tags: project.tags,
    ai_tools: project.aiTools,
    vci_score: project.vciScore,
    community_vci_score: project.communityVciScore,
    submitted_by: userId,
    is_verified: false,
    analysis: project.analysis,
    confidence: project.confidence,
    indicators: project.indicators,
    development_process: {
      challenges: project.developmentProcess.challenges,
      learnings: project.developmentProcess.learnings
    },
    prompts: project.prompts,
    code_breakdown: {
      aiGenerated: project.codeBreakdown.aiGenerated,
      aiModified: project.codeBreakdown.aiModified,
      humanWritten: project.codeBreakdown.humanWritten
    }
  };
}

function transformCommentFromDB(dbComment: any): Comment {
  return {
    id: dbComment.id,
    projectId: dbComment.project_id,
    author: dbComment.profiles?.username || 'unknown',
    content: dbComment.content,
    createdAt: new Date(dbComment.created_at),
    upvotes: dbComment.upvotes || 0,
    downvotes: dbComment.downvotes || 0,
    parentId: dbComment.parent_id,
    karma: dbComment.karma || 0,
    vciVote: dbComment.vci_vote,
    isOP: false // We'll need to determine this based on the project author
  };
}

function transformUserFromDB(dbUser: any): User {
  return {
    id: dbUser.id,
    username: dbUser.username,
    avatar: dbUser.avatar_url,
    karma: dbUser.karma || 0,
    projectsSubmitted: dbUser.projects_submitted || 0,
    joinedAt: new Date(dbUser.joined_at || dbUser.created_at),
    specialization: dbUser.specialization,
    aiToolsUsed: dbUser.ai_tools_used || []
  };
}

function extractRepoName(githubUrl: string): string {
  if (!githubUrl) return '';
  const match = githubUrl.match(/github\.com\/[^\/]+\/([^\/]+)/);
  return match ? match[1].replace(/\.git$/, '') : '';
}