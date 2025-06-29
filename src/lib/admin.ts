import { supabase } from '../context/AuthContext';

export interface AdminRole {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  created_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role_id: string;
  assigned_by: string;
  assigned_at: string;
  role: AdminRole;
  user: {
    username: string;
    avatar_url?: string;
  };
}

export interface AdminAction {
  id: string;
  admin_id: string;
  action_type: string;
  target_type: string;
  target_id?: string;
  details: Record<string, any>;
  created_at: string;
  admin: {
    username: string;
  };
}

export interface AdminStats {
  totalUsers: number;
  totalProjects: number;
  totalComments: number;
  bannedUsers: number;
  hiddenComments: number;
  featuredProjects: number;
  recentActions: number;
}

export interface ModerationProject {
  id: string;
  title: string;
  description: string;
  submitted_by: string;
  submitted_at: string;
  upvotes: number;
  downvotes: number;
  comment_count: number;
  is_featured: boolean;
  is_pinned: boolean;
  is_verified: boolean;
  admin_notes?: string;
  submitter: {
    username: string;
    is_banned: boolean;
  };
}

export interface ModerationComment {
  id: string;
  content: string;
  author_id: string;
  project_id: string;
  created_at: string;
  upvotes: number;
  downvotes: number;
  is_hidden: boolean;
  moderation_reason?: string;
  moderated_by?: string;
  moderated_at?: string;
  author: {
    username: string;
    is_banned: boolean;
  };
  project: {
    title: string;
  };
}

export interface ModerationUser {
  id: string;
  username: string;
  avatar_url?: string;
  karma: number;
  projects_submitted: number;
  joined_at: string;
  is_banned: boolean;
  ban_reason?: string;
  banned_by?: string;
  banned_at?: string;
  follower_count: number;
  following_count: number;
}

export const adminService = {
  // Check if current user is admin
  async isAdmin(): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('is_admin');
      if (error) throw error;
      return data || false;
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  },

  // Check if current user has specific permission
  async hasPermission(permission: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('has_permission', {
        permission_name: permission
      });
      if (error) throw error;
      return data || false;
    } catch (error) {
      console.error('Error checking permission:', error);
      return false;
    }
  },

  // Get admin dashboard stats
  async getAdminStats(): Promise<AdminStats> {
    try {
      const [
        { count: totalUsers },
        { count: totalProjects },
        { count: totalComments },
        { count: bannedUsers },
        { count: hiddenComments },
        { count: featuredProjects },
        { count: recentActions }
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('projects').select('*', { count: 'exact', head: true }),
        supabase.from('comments').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_banned', true),
        supabase.from('comments').select('*', { count: 'exact', head: true }).eq('is_hidden', true),
        supabase.from('projects').select('*', { count: 'exact', head: true }).eq('is_featured', true),
        supabase.from('admin_actions').select('*', { count: 'exact', head: true }).gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      ]);

      return {
        totalUsers: totalUsers || 0,
        totalProjects: totalProjects || 0,
        totalComments: totalComments || 0,
        bannedUsers: bannedUsers || 0,
        hiddenComments: hiddenComments || 0,
        featuredProjects: featuredProjects || 0,
        recentActions: recentActions || 0
      };
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      throw error;
    }
  },

  // Get admin roles
  async getAdminRoles(): Promise<AdminRole[]> {
    try {
      const { data, error } = await supabase
        .from('admin_roles')
        .select('*')
        .order('name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching admin roles:', error);
      throw error;
    }
  },

  // Get user roles
  async getUserRoles(limit: number = 50, offset: number = 0): Promise<UserRole[]> {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select(`
          *,
          role:admin_roles(*),
          user:profiles(username, avatar_url)
        `)
        .order('assigned_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching user roles:', error);
      throw error;
    }
  },

  // Assign role to user
  async assignRole(userId: string, roleId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role_id: roleId,
          assigned_by: (await supabase.auth.getUser()).data.user?.id
        });

      if (error) throw error;

      // Log action
      await supabase.rpc('log_admin_action', {
        action_type: 'assign_role',
        target_type: 'user',
        target_id: userId,
        details: { role_id: roleId }
      });
    } catch (error) {
      console.error('Error assigning role:', error);
      throw error;
    }
  },

  // Remove role from user
  async removeRole(userId: string, roleId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role_id', roleId);

      if (error) throw error;

      // Log action
      await supabase.rpc('log_admin_action', {
        action_type: 'remove_role',
        target_type: 'user',
        target_id: userId,
        details: { role_id: roleId }
      });
    } catch (error) {
      console.error('Error removing role:', error);
      throw error;
    }
  },

  // Get admin actions log
  async getAdminActions(limit: number = 50, offset: number = 0): Promise<AdminAction[]> {
    try {
      const { data, error } = await supabase
        .from('admin_actions')
        .select(`
          *,
          admin:profiles(username)
        `)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching admin actions:', error);
      throw error;
    }
  },

  // Get projects for moderation
  async getModerationProjects(limit: number = 50, offset: number = 0): Promise<ModerationProject[]> {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          submitter:profiles!submitted_by(username, is_banned)
        `)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching moderation projects:', error);
      throw error;
    }
  },

  // Get comments for moderation
  async getModerationComments(limit: number = 50, offset: number = 0): Promise<ModerationComment[]> {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          author:profiles!author_id(username, is_banned),
          project:projects(title)
        `)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching moderation comments:', error);
      throw error;
    }
  },

  // Get users for moderation
  async getModerationUsers(limit: number = 50, offset: number = 0): Promise<ModerationUser[]> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('joined_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching moderation users:', error);
      throw error;
    }
  },

  // Moderate comment
  async moderateComment(commentId: string, hideComment: boolean, reason?: string): Promise<void> {
    try {
      const { error } = await supabase.rpc('moderate_comment', {
        comment_id: commentId,
        hide_comment: hideComment,
        reason: reason || null
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error moderating comment:', error);
      throw error;
    }
  },

  // Moderate user (ban/unban)
  async moderateUser(userId: string, banUser: boolean, reason?: string): Promise<void> {
    try {
      const { error } = await supabase.rpc('moderate_user', {
        target_user_id: userId,
        ban_user: banUser,
        reason: reason || null
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error moderating user:', error);
      throw error;
    }
  },

  // Moderate project (feature/pin)
  async moderateProject(
    projectId: string, 
    options: {
      isFeatured?: boolean;
      isPinned?: boolean;
      adminNotes?: string;
    }
  ): Promise<void> {
    try {
      const { error } = await supabase.rpc('moderate_project', {
        project_id: projectId,
        is_featured: options.isFeatured ?? null,
        is_pinned: options.isPinned ?? null,
        admin_notes: options.adminNotes ?? null
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error moderating project:', error);
      throw error;
    }
  }
};