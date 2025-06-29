/*
  # Fix comment notification function error

  1. Problem
    - The create_comment_notification() function has an error where it tries to access 
      a record variable that may not be assigned
    - This causes "record 'parent_comment_record' is not assigned yet" error

  2. Solution
    - Rewrite the function with proper error handling
    - Add proper checks for record existence before accessing fields
    - Ensure all code paths handle null/missing records gracefully

  3. Changes
    - Drop and recreate the create_comment_notification() function
    - Add proper FOUND checks after SELECT INTO statements
    - Add null safety checks for all record field access
*/

-- Drop the existing function
DROP FUNCTION IF EXISTS create_comment_notification() CASCADE;

-- Recreate the function with proper error handling
CREATE OR REPLACE FUNCTION create_comment_notification()
RETURNS TRIGGER AS $$
DECLARE
  parent_comment_author_id uuid;
  project_author_id uuid;
BEGIN
  -- Get the project author ID
  SELECT submitted_by INTO project_author_id
  FROM projects 
  WHERE id = NEW.project_id;

  -- If this is a reply to another comment
  IF NEW.parent_id IS NOT NULL THEN
    -- Get the parent comment's author ID
    SELECT author_id INTO parent_comment_author_id
    FROM comments 
    WHERE id = NEW.parent_id;
    
    -- Only create notification if we found a parent comment with an author
    -- and the author is not replying to themselves
    IF parent_comment_author_id IS NOT NULL AND parent_comment_author_id != NEW.author_id THEN
      INSERT INTO notifications (
        recipient_id,
        sender_id,
        type,
        entity_id,
        entity_type,
        message,
        link
      ) VALUES (
        parent_comment_author_id,
        NEW.author_id,
        'comment_reply',
        NEW.id,
        'comment',
        'replied to your comment',
        '/project/' || NEW.project_id::text
      );
    END IF;
  END IF;

  -- If this is a top-level comment on a project, notify the project author
  IF NEW.parent_id IS NULL AND project_author_id IS NOT NULL AND project_author_id != NEW.author_id THEN
    INSERT INTO notifications (
      recipient_id,
      sender_id,
      type,
      entity_id,
      entity_type,
      message,
      link
    ) VALUES (
      project_author_id,
      NEW.author_id,
      'project_comment',
      NEW.project_id,
      'project',
      'commented on your project',
      '/project/' || NEW.project_id::text
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
DROP TRIGGER IF EXISTS create_comment_notification_trigger ON comments;
CREATE TRIGGER create_comment_notification_trigger
  AFTER INSERT ON comments
  FOR EACH ROW
  EXECUTE FUNCTION create_comment_notification();