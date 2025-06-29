/*
  # Create voting system tables

  1. New Tables
    - `project_votes` - Individual user votes on projects
      - `id` (uuid, primary key)
      - `project_id` (uuid, references projects)
      - `user_id` (uuid, references auth.users)
      - `vote_type` (text, 'up' or 'down')
      - `created_at` (timestamptz, default now)
      - `updated_at` (timestamptz, default now)
    
    - `comment_votes` - Individual user votes on comments
      - `id` (uuid, primary key)
      - `comment_id` (uuid, references comments)
      - `user_id` (uuid, references auth.users)
      - `vote_type` (text, 'up' or 'down')
      - `created_at` (timestamptz, default now)
      - `updated_at` (timestamptz, default now)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage their own votes
    - Add policies to read all votes for vote count calculations

  3. Triggers
    - Auto-update vote counts in projects and comments tables
    - Update updated_at timestamps on vote changes
    - Prevent duplicate votes with unique constraints

  4. Functions
    - Functions to recalculate vote totals when votes change
    - Triggers to maintain data consistency
*/

-- Create project_votes table
CREATE TABLE IF NOT EXISTS project_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vote_type text NOT NULL CHECK (vote_type IN ('up', 'down')),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  
  -- Ensure one vote per user per project
  UNIQUE(project_id, user_id)
);

-- Create comment_votes table
CREATE TABLE IF NOT EXISTS comment_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vote_type text NOT NULL CHECK (vote_type IN ('up', 'down')),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  
  -- Ensure one vote per user per comment
  UNIQUE(comment_id, user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_project_votes_project_id ON project_votes(project_id);
CREATE INDEX IF NOT EXISTS idx_project_votes_user_id ON project_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_project_votes_vote_type ON project_votes(vote_type);

CREATE INDEX IF NOT EXISTS idx_comment_votes_comment_id ON comment_votes(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_votes_user_id ON comment_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_comment_votes_vote_type ON comment_votes(vote_type);

-- Enable Row Level Security
ALTER TABLE project_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_votes ENABLE ROW LEVEL SECURITY;

-- Project votes policies
CREATE POLICY "Users can view all project votes"
  ON project_votes
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own project votes"
  ON project_votes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own project votes"
  ON project_votes
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own project votes"
  ON project_votes
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Comment votes policies
CREATE POLICY "Users can view all comment votes"
  ON comment_votes
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own comment votes"
  ON comment_votes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comment votes"
  ON comment_votes
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comment votes"
  ON comment_votes
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to update project vote counts
CREATE OR REPLACE FUNCTION update_project_vote_counts()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the project's vote counts
  UPDATE projects 
  SET 
    upvotes = (
      SELECT COUNT(*) 
      FROM project_votes 
      WHERE project_id = COALESCE(NEW.project_id, OLD.project_id) 
      AND vote_type = 'up'
    ),
    downvotes = (
      SELECT COUNT(*) 
      FROM project_votes 
      WHERE project_id = COALESCE(NEW.project_id, OLD.project_id) 
      AND vote_type = 'down'
    )
  WHERE id = COALESCE(NEW.project_id, OLD.project_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Function to update comment vote counts
CREATE OR REPLACE FUNCTION update_comment_vote_counts()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the comment's vote counts
  UPDATE comments 
  SET 
    upvotes = (
      SELECT COUNT(*) 
      FROM comment_votes 
      WHERE comment_id = COALESCE(NEW.comment_id, OLD.comment_id) 
      AND vote_type = 'up'
    ),
    downvotes = (
      SELECT COUNT(*) 
      FROM comment_votes 
      WHERE comment_id = COALESCE(NEW.comment_id, OLD.comment_id) 
      AND vote_type = 'down'
    )
  WHERE id = COALESCE(NEW.comment_id, OLD.comment_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Create triggers for project vote count updates
DROP TRIGGER IF EXISTS update_project_votes_on_insert ON project_votes;
CREATE TRIGGER update_project_votes_on_insert
  AFTER INSERT ON project_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_project_vote_counts();

DROP TRIGGER IF EXISTS update_project_votes_on_update ON project_votes;
CREATE TRIGGER update_project_votes_on_update
  AFTER UPDATE ON project_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_project_vote_counts();

DROP TRIGGER IF EXISTS update_project_votes_on_delete ON project_votes;
CREATE TRIGGER update_project_votes_on_delete
  AFTER DELETE ON project_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_project_vote_counts();

-- Create triggers for comment vote count updates
DROP TRIGGER IF EXISTS update_comment_votes_on_insert ON comment_votes;
CREATE TRIGGER update_comment_votes_on_insert
  AFTER INSERT ON comment_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_comment_vote_counts();

DROP TRIGGER IF EXISTS update_comment_votes_on_update ON comment_votes;
CREATE TRIGGER update_comment_votes_on_update
  AFTER UPDATE ON comment_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_comment_vote_counts();

DROP TRIGGER IF EXISTS update_comment_votes_on_delete ON comment_votes;
CREATE TRIGGER update_comment_votes_on_delete
  AFTER DELETE ON comment_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_comment_vote_counts();

-- Create triggers for updated_at timestamps
DROP TRIGGER IF EXISTS update_project_votes_updated_at ON project_votes;
CREATE TRIGGER update_project_votes_updated_at
  BEFORE UPDATE ON project_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_comment_votes_updated_at ON comment_votes;
CREATE TRIGGER update_comment_votes_updated_at
  BEFORE UPDATE ON comment_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Recalculate existing vote counts for all projects and comments
-- This ensures data consistency for any existing data

-- Update project vote counts
UPDATE projects 
SET 
  upvotes = COALESCE((
    SELECT COUNT(*) 
    FROM project_votes 
    WHERE project_id = projects.id 
    AND vote_type = 'up'
  ), 0),
  downvotes = COALESCE((
    SELECT COUNT(*) 
    FROM project_votes 
    WHERE project_id = projects.id 
    AND vote_type = 'down'
  ), 0);

-- Update comment vote counts
UPDATE comments 
SET 
  upvotes = COALESCE((
    SELECT COUNT(*) 
    FROM comment_votes 
    WHERE comment_id = comments.id 
    AND vote_type = 'up'
  ), 0),
  downvotes = COALESCE((
    SELECT COUNT(*) 
    FROM comment_votes 
    WHERE comment_id = comments.id 
    AND vote_type = 'down'
  ), 0);