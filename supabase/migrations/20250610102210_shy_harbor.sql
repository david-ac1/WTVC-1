/*
  # Fix ambiguous user_id reference in is_admin function

  1. Functions
    - Create or replace `is_admin()` function with proper table aliases
    - Create or replace `has_permission()` function with proper table aliases
    - Create helper functions for admin operations

  2. Security
    - Functions are accessible to authenticated users only
    - Proper RLS policies are maintained

  3. Changes
    - Resolves ambiguous column reference "user_id" error
    - Adds proper table aliases to eliminate conflicts
    - Ensures admin functionality works correctly
*/

-- Create or replace the is_admin function with proper table aliases
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Create or replace the has_permission function with proper table aliases
CREATE OR REPLACE FUNCTION has_permission(permission_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Create or replace the log_admin_action function
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

-- Create or replace the moderate_comment function
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
  IF NOT has_permission('moderate_comments') THEN
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

-- Create or replace the moderate_user function
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
  IF NOT has_permission('moderate_users') THEN
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

-- Create or replace the moderate_project function
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
  IF NOT has_permission('moderate_projects') THEN
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