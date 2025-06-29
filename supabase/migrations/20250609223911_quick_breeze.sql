/*
  # Fix comment notification function

  1. Database Functions
    - Fix the `create_comment_notification` function to properly handle cases where parent comment doesn't exist
    - Add proper null checks and conditional logic to prevent "record not assigned yet" errors

  2. Changes Made
    - Add conditional checks before accessing parent_comment_record fields
    - Ensure the function handles both root comments and replies properly
    - Add proper error handling for edge cases
*/

-- Drop and recreate the comment notification function with proper error handling
CREATE OR REPLACE FUNCTION create_comment_notification()
RETURNS TRIGGER AS $$
DECLARE
  parent_comment_record comments%ROWTYPE;
  project_author_id uuid;
  notification_message text;
  notification_link text;
BEGIN
  -- Get the project author
  SELECT submitted_by INTO project_author_id
  FROM projects 
  WHERE id = NEW.project_id;

  -- If this is a reply to another comment
  IF NEW.parent_id IS NOT NULL THEN
    -- Try to get the parent comment
    SELECT * INTO parent_comment_record
    FROM comments 
    WHERE id = NEW.parent_id;
    
    -- Only proceed if we found the parent comment and it has an author
    IF FOUND AND parent_comment_record.author_id IS NOT NULL THEN
      -- Don't notify if replying to own comment
      IF parent_comment_record.author_id != NEW.author_id THEN
        -- Create notification for comment reply
        INSERT INTO notifications (
          recipient_id,
          sender_id,
          type,
          entity_id,
          entity_type,
          message,
          link
        ) VALUES (
          parent_comment_record.author_id,
          NEW.author_id,
          'comment_reply',
          NEW.id,
          'comment',
          'replied to your comment',
          '/project/' || NEW.project_id::text
        );
      END IF;
    END IF;
  END IF;

  -- If this is a comment on a project (not a reply), notify the project author
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