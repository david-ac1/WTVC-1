/*
  # Admin System Implementation

  1. New Tables
    - `admin_roles` - Define different admin role types
    - `user_roles` - Assign roles to users
    - `admin_actions` - Log all admin actions for audit trail

  2. Security
    - Enable RLS on all admin tables
    - Add policies for admin-only access
    - Create functions to check admin permissions

  3. Features
    - Role-based access control
    - Admin action logging
    - User management capabilities
    - Content moderation tools
*/

-- Create admin roles table
CREATE TABLE IF NOT EXISTS admin_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  permissions jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create user roles table
CREATE TABLE IF NOT EXISTS user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES admin_roles(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_at timestamptz DEFAULT now() NOT NULL,
  
  -- Ensure one role per user
  UNIQUE(user_id, role_id)
);

-- Create admin actions log table
CREATE TABLE IF NOT EXISTS admin_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  target_type text NOT NULL,
  target_id uuid,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_admin_id ON admin_actions(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_created_at ON admin_actions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_actions_action_type ON admin_actions(action_type);

-- Enable RLS
ALTER TABLE admin_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id uuid DEFAULT auth.uid())
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM user_roles ur
    JOIN admin_roles ar ON ur.role_id = ar.id
    WHERE ur.user_id = user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has specific permission
CREATE OR REPLACE FUNCTION has_permission(permission_name text, user_id uuid DEFAULT auth.uid())
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM user_roles ur
    JOIN admin_roles ar ON ur.role_id = ar.id
    WHERE ur.user_id = user_id
    AND ar.permissions ? permission_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log admin actions
CREATE OR REPLACE FUNCTION log_admin_action(
  action_type text,
  target_type text,
  target_id uuid DEFAULT NULL,
  details jsonb DEFAULT '{}'::jsonb
)
RETURNS void AS $$
BEGIN
  INSERT INTO admin_actions (admin_id, action_type, target_type, target_id, details)
  VALUES (auth.uid(), action_type, target_type, target_id, details);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin roles policies
CREATE POLICY "Admins can view admin roles"
  ON admin_roles
  FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Super admins can manage admin roles"
  ON admin_roles
  FOR ALL
  TO authenticated
  USING (has_permission('manage_roles'));

-- User roles policies
CREATE POLICY "Admins can view user roles"
  ON user_roles
  FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can manage user roles"
  ON user_roles
  FOR ALL
  TO authenticated
  USING (has_permission('manage_users'));

-- Admin actions policies
CREATE POLICY "Admins can view admin actions"
  ON admin_actions
  FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "System can insert admin actions"
  ON admin_actions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = admin_id);

-- Insert default admin roles
INSERT INTO admin_roles (name, description, permissions) VALUES
  ('super_admin', 'Super Administrator with all permissions', '["manage_users", "manage_roles", "manage_projects", "manage_comments", "view_analytics", "moderate_content"]'::jsonb),
  ('moderator', 'Content Moderator', '["moderate_content", "manage_comments", "view_analytics"]'::jsonb),
  ('analyst', 'Analytics Viewer', '["view_analytics"]'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- Add admin flag to projects for featured/pinned content
ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_pinned boolean DEFAULT false;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS admin_notes text;

-- Add moderation fields to comments
ALTER TABLE comments ADD COLUMN IF NOT EXISTS is_hidden boolean DEFAULT false;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS moderation_reason text;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS moderated_by uuid REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS moderated_at timestamptz;

-- Add user status fields to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_banned boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ban_reason text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS banned_by uuid REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS banned_at timestamptz;

-- Function to moderate comment
CREATE OR REPLACE FUNCTION moderate_comment(
  comment_id uuid,
  hide_comment boolean,
  reason text DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  -- Check if user has moderation permission
  IF NOT has_permission('moderate_content') THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  -- Update comment
  UPDATE comments 
  SET 
    is_hidden = hide_comment,
    moderation_reason = reason,
    moderated_by = auth.uid(),
    moderated_at = now()
  WHERE id = comment_id;

  -- Log action
  PERFORM log_admin_action(
    CASE WHEN hide_comment THEN 'hide_comment' ELSE 'unhide_comment' END,
    'comment',
    comment_id,
    jsonb_build_object('reason', reason)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to ban/unban user
CREATE OR REPLACE FUNCTION moderate_user(
  target_user_id uuid,
  ban_user boolean,
  reason text DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  -- Check if user has user management permission
  IF NOT has_permission('manage_users') THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  -- Update user
  UPDATE profiles 
  SET 
    is_banned = ban_user,
    ban_reason = reason,
    banned_by = auth.uid(),
    banned_at = CASE WHEN ban_user THEN now() ELSE NULL END
  WHERE id = target_user_id;

  -- Log action
  PERFORM log_admin_action(
    CASE WHEN ban_user THEN 'ban_user' ELSE 'unban_user' END,
    'user',
    target_user_id,
    jsonb_build_object('reason', reason)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to feature/pin project
CREATE OR REPLACE FUNCTION moderate_project(
  project_id uuid,
  is_featured boolean DEFAULT NULL,
  is_pinned boolean DEFAULT NULL,
  admin_notes text DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  -- Check if user has project management permission
  IF NOT has_permission('manage_projects') THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  -- Update project
  UPDATE projects 
  SET 
    is_featured = COALESCE(moderate_project.is_featured, projects.is_featured),
    is_pinned = COALESCE(moderate_project.is_pinned, projects.is_pinned),
    admin_notes = COALESCE(moderate_project.admin_notes, projects.admin_notes)
  WHERE id = project_id;

  -- Log action
  PERFORM log_admin_action(
    'moderate_project',
    'project',
    project_id,
    jsonb_build_object(
      'is_featured', is_featured,
      'is_pinned', is_pinned,
      'admin_notes', admin_notes
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update project policies to hide banned user content
DROP POLICY IF EXISTS "Anyone can view projects" ON projects;
CREATE POLICY "Anyone can view projects"
  ON projects
  FOR SELECT
  TO authenticated
  USING (
    NOT EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = projects.submitted_by 
      AND is_banned = true
    )
  );

-- Update comment policies to hide banned user content and hidden comments
DROP POLICY IF EXISTS "Anyone can view comments" ON comments;
CREATE POLICY "Anyone can view comments"
  ON comments
  FOR SELECT
  TO authenticated
  USING (
    is_hidden = false
    AND NOT EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = comments.author_id 
      AND is_banned = true
    )
  );

-- Admin override policy for viewing hidden content
CREATE POLICY "Admins can view all comments"
  ON comments
  FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can view all projects"
  ON projects
  FOR SELECT
  TO authenticated
  USING (is_admin());