/*
  # Fix Admin Functions Ambiguity

  1. Problem
    - Multiple function signatures for is_admin() and has_permission() causing ambiguity
    - PostgREST cannot choose between function overloads

  2. Solution
    - Drop ALL existing function variants with CASCADE to remove dependent policies
    - Recreate functions with single, unambiguous signatures
    - Recreate all dependent RLS policies
    - Ensure all moderation functions use correct permission names

  3. Changes
    - Drop is_admin(uuid) and is_admin() variants
    - Drop has_permission(text, uuid) and has_permission(text) variants
    - Create single is_admin() function (no parameters, uses auth.uid() internally)
    - Create single has_permission(permission_name text) function
    - Recreate all dependent policies and functions
*/

-- Drop ALL existing function variants with CASCADE to remove dependent policies
DROP FUNCTION IF EXISTS is_admin(uuid) CASCADE;
DROP FUNCTION IF EXISTS is_admin() CASCADE;
DROP FUNCTION IF EXISTS has_permission(text, uuid) CASCADE;
DROP FUNCTION IF EXISTS has_permission(text) CASCADE;
DROP FUNCTION IF EXISTS log_admin_action(text, text, uuid, jsonb) CASCADE;
DROP FUNCTION IF EXISTS moderate_comment(uuid, boolean, text) CASCADE;
DROP FUNCTION IF EXISTS moderate_user(uuid, boolean, text) CASCADE;
DROP FUNCTION IF EXISTS moderate_project(uuid, boolean, boolean, text) CASCADE;

-- Create unambiguous is_admin function (no parameters)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM user_roles ur
    JOIN admin_roles ar ON ur.role_id = ar.id
    WHERE ur.user_id = auth.uid()
  );
END;
$$;

-- Create unambiguous has_permission function (single text parameter)
CREATE OR REPLACE FUNCTION has_permission(permission_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM user_roles ur
    JOIN admin_roles ar ON ur.role_id = ar.id
    WHERE ur.user_id = auth.uid()
    AND ar.permissions ? permission_name
  );
END;
$$;

-- Create log_admin_action function
CREATE OR REPLACE FUNCTION log_admin_action(
  action_type text,
  target_type text,
  target_id uuid DEFAULT NULL,
  details jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO admin_actions (admin_id, action_type, target_type, target_id, details)
  VALUES (auth.uid(), action_type, target_type, target_id, details);
END;
$$;

-- Create moderate_comment function
CREATE OR REPLACE FUNCTION moderate_comment(
  comment_id uuid,
  hide_comment boolean,
  reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user has permission
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
$$;

-- Create moderate_user function
CREATE OR REPLACE FUNCTION moderate_user(
  target_user_id uuid,
  ban_user boolean,
  reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user has permission
  IF NOT has_permission('manage_users') THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  -- Update user profile
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
$$;

-- Create moderate_project function
CREATE OR REPLACE FUNCTION moderate_project(
  project_id uuid,
  is_featured boolean DEFAULT NULL,
  is_pinned boolean DEFAULT NULL,
  admin_notes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  update_data jsonb := '{}'::jsonb;
BEGIN
  -- Check if user has permission
  IF NOT has_permission('manage_projects') THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  -- Build update query dynamically
  UPDATE projects 
  SET 
    is_featured = COALESCE(moderate_project.is_featured, projects.is_featured),
    is_pinned = COALESCE(moderate_project.is_pinned, projects.is_pinned),
    admin_notes = COALESCE(moderate_project.admin_notes, projects.admin_notes)
  WHERE id = project_id;

  -- Build log data
  IF is_featured IS NOT NULL THEN
    update_data := update_data || jsonb_build_object('is_featured', is_featured);
  END IF;
  
  IF is_pinned IS NOT NULL THEN
    update_data := update_data || jsonb_build_object('is_pinned', is_pinned);
  END IF;
  
  IF admin_notes IS NOT NULL THEN
    update_data := update_data || jsonb_build_object('admin_notes', admin_notes);
  END IF;

  -- Log action
  PERFORM log_admin_action(
    'moderate_project',
    'project',
    project_id,
    update_data
  );
END;
$$;

-- Recreate admin_roles policies
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

-- Recreate user_roles policies
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

-- Recreate admin_actions policies
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

-- Recreate projects policies
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

CREATE POLICY "Admins can view all projects"
  ON projects
  FOR SELECT
  TO authenticated
  USING (is_admin());

-- Recreate comments policies
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

CREATE POLICY "Admins can view all comments"
  ON comments
  FOR SELECT
  TO authenticated
  USING (is_admin());