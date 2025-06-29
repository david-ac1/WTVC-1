/*
  # Create Notifications System

  1. New Tables
    - `notifications` - Store all user notifications
      - `id` (uuid, primary key)
      - `recipient_id` (uuid, references profiles.id) - User receiving the notification
      - `sender_id` (uuid, references profiles.id, nullable) - User who triggered the notification
      - `type` (text) - Type of notification (project_upvote, comment_reply, etc.)
      - `entity_id` (uuid) - ID of the related entity (project_id, comment_id)
      - `entity_type` (text) - Type of entity (project, comment)
      - `message` (text) - Human-readable notification message
      - `link` (text) - URL path to navigate to when clicked
      - `is_read` (boolean, default false) - Whether notification has been viewed
      - `created_at` (timestamptz, default now) - When notification was created

  2. Security
    - Enable RLS on notifications table
    - Users can only view/update/delete their own notifications
    - No direct INSERT policy (notifications created by triggers/functions)

  3. Indexes
    - Index on recipient_id for fast user notification queries
    - Index on created_at for chronological ordering
    - Index on is_read for filtering unread notifications

  4. Triggers
    - Auto-create notifications for project votes
    - Auto-create notifications for comments
    - Auto-create notifications for comment replies
*/

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN (
    'project_upvote',
    'project_downvote', 
    'project_comment',
    'comment_reply',
    'comment_upvote',
    'comment_downvote'
  )),
  entity_id uuid NOT NULL,
  entity_type text NOT NULL CHECK (entity_type IN ('project', 'comment')),
  message text NOT NULL,
  link text NOT NULL,
  is_read boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id ON notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread ON notifications(recipient_id, is_read) WHERE is_read = false;

-- Enable Row Level Security
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications"
  ON notifications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = recipient_id);

CREATE POLICY "Users can update their own notifications"
  ON notifications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id);

CREATE POLICY "Users can delete their own notifications"
  ON notifications
  FOR DELETE
  TO authenticated
  USING (auth.uid() = recipient_id);

-- Function to create project vote notifications
CREATE OR REPLACE FUNCTION create_project_vote_notification()
RETURNS TRIGGER AS $$
DECLARE
  project_record RECORD;
  sender_username text;
  notification_message text;
  notification_link text;
BEGIN
  -- Get project details and owner
  SELECT p.*, pr.username as owner_username, pr.id as owner_id
  INTO project_record
  FROM projects p
  JOIN profiles pr ON p.submitted_by = pr.id
  WHERE p.id = NEW.project_id;

  -- Don't create notification if user is voting on their own project
  IF project_record.owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  -- Get sender username
  SELECT username INTO sender_username
  FROM profiles
  WHERE id = NEW.user_id;

  -- Create notification message and link
  IF NEW.vote_type = 'up' THEN
    notification_message := sender_username || ' upvoted your project "' || project_record.title || '"';
  ELSE
    notification_message := sender_username || ' downvoted your project "' || project_record.title || '"';
  END IF;

  notification_link := '/project/' || NEW.project_id;

  -- Insert notification
  INSERT INTO notifications (
    recipient_id,
    sender_id,
    type,
    entity_id,
    entity_type,
    message,
    link
  ) VALUES (
    project_record.owner_id,
    NEW.user_id,
    'project_' || NEW.vote_type || 'vote',
    NEW.project_id,
    'project',
    notification_message,
    notification_link
  );

  RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to create comment notifications
CREATE OR REPLACE FUNCTION create_comment_notification()
RETURNS TRIGGER AS $$
DECLARE
  project_record RECORD;
  parent_comment_record RECORD;
  sender_username text;
  notification_message text;
  notification_link text;
BEGIN
  -- Get sender username
  SELECT username INTO sender_username
  FROM profiles
  WHERE id = NEW.author_id;

  -- Get project details
  SELECT p.*, pr.username as owner_username, pr.id as owner_id
  INTO project_record
  FROM projects p
  JOIN profiles pr ON p.submitted_by = pr.id
  WHERE p.id = NEW.project_id;

  notification_link := '/project/' || NEW.project_id || '#comment-' || NEW.id;

  -- If this is a reply to another comment
  IF NEW.parent_id IS NOT NULL THEN
    -- Get parent comment details
    SELECT c.*, pr.username as author_username, pr.id as author_id
    INTO parent_comment_record
    FROM comments c
    JOIN profiles pr ON c.author_id = pr.id
    WHERE c.id = NEW.parent_id;

    -- Create notification for parent comment author (if not replying to self)
    IF parent_comment_record.author_id != NEW.author_id THEN
      notification_message := sender_username || ' replied to your comment on "' || project_record.title || '"';
      
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
        notification_message,
        notification_link
      );
    END IF;
  END IF;

  -- Create notification for project owner (if not commenting on own project and not already notified via reply)
  IF project_record.owner_id != NEW.author_id AND 
     (NEW.parent_id IS NULL OR parent_comment_record.author_id != project_record.owner_id) THEN
    notification_message := sender_username || ' commented on your project "' || project_record.title || '"';
    
    INSERT INTO notifications (
      recipient_id,
      sender_id,
      type,
      entity_id,
      entity_type,
      message,
      link
    ) VALUES (
      project_record.owner_id,
      NEW.author_id,
      'project_comment',
      NEW.id,
      'comment',
      notification_message,
      notification_link
    );
  END IF;

  RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to create comment vote notifications
CREATE OR REPLACE FUNCTION create_comment_vote_notification()
RETURNS TRIGGER AS $$
DECLARE
  comment_record RECORD;
  sender_username text;
  notification_message text;
  notification_link text;
BEGIN
  -- Get comment details and author
  SELECT c.*, pr.username as author_username, pr.id as author_id, p.title as project_title
  INTO comment_record
  FROM comments c
  JOIN profiles pr ON c.author_id = pr.id
  JOIN projects p ON c.project_id = p.id
  WHERE c.id = NEW.comment_id;

  -- Don't create notification if user is voting on their own comment
  IF comment_record.author_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  -- Get sender username
  SELECT username INTO sender_username
  FROM profiles
  WHERE id = NEW.user_id;

  -- Create notification message and link
  IF NEW.vote_type = 'up' THEN
    notification_message := sender_username || ' upvoted your comment on "' || comment_record.project_title || '"';
  ELSE
    notification_message := sender_username || ' downvoted your comment on "' || comment_record.project_title || '"';
  END IF;

  notification_link := '/project/' || comment_record.project_id || '#comment-' || NEW.comment_id;

  -- Insert notification
  INSERT INTO notifications (
    recipient_id,
    sender_id,
    type,
    entity_id,
    entity_type,
    message,
    link
  ) VALUES (
    comment_record.author_id,
    NEW.user_id,
    'comment_' || NEW.vote_type || 'vote',
    NEW.comment_id,
    'comment',
    notification_message,
    notification_link
  );

  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for automatic notification creation

-- Project vote notifications
DROP TRIGGER IF EXISTS create_project_vote_notification_trigger ON project_votes;
CREATE TRIGGER create_project_vote_notification_trigger
  AFTER INSERT ON project_votes
  FOR EACH ROW
  EXECUTE FUNCTION create_project_vote_notification();

-- Comment notifications
DROP TRIGGER IF EXISTS create_comment_notification_trigger ON comments;
CREATE TRIGGER create_comment_notification_trigger
  AFTER INSERT ON comments
  FOR EACH ROW
  EXECUTE FUNCTION create_comment_notification();

-- Comment vote notifications
DROP TRIGGER IF EXISTS create_comment_vote_notification_trigger ON comment_votes;
CREATE TRIGGER create_comment_vote_notification_trigger
  AFTER INSERT ON comment_votes
  FOR EACH ROW
  EXECUTE FUNCTION create_comment_vote_notification();

-- Function to clean up old notifications (optional, for maintenance)
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS void AS $$
BEGIN
  -- Delete notifications older than 30 days
  DELETE FROM notifications 
  WHERE created_at < NOW() - INTERVAL '30 days';
  
  -- Keep only the 100 most recent notifications per user
  DELETE FROM notifications 
  WHERE id IN (
    SELECT id FROM (
      SELECT id, 
             ROW_NUMBER() OVER (PARTITION BY recipient_id ORDER BY created_at DESC) as rn
      FROM notifications
    ) ranked
    WHERE rn > 100
  );
END;
$$ language 'plpgsql';

-- Create a function to mark notifications as read
CREATE OR REPLACE FUNCTION mark_notifications_as_read(notification_ids uuid[])
RETURNS void AS $$
BEGIN
  UPDATE notifications 
  SET is_read = true 
  WHERE id = ANY(notification_ids) 
    AND recipient_id = auth.uid();
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Create a function to get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count()
RETURNS integer AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::integer
    FROM notifications 
    WHERE recipient_id = auth.uid() 
      AND is_read = false
  );
END;
$$ language 'plpgsql' SECURITY DEFINER;