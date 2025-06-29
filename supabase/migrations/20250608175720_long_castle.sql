/*
  # Comprehensive Database Reset and Schema Alignment

  This migration completely resets the database schema to match the application's expectations.
  
  1. New Tables
    - `profiles` - User profile information linked to auth.users
    - `projects` - Project submissions with all required fields
    - `comments` - Comments on projects with threading support
    - `ai_tools` - Master list of AI tools
  
  2. Security
    - Enable RLS on all tables
    - Add appropriate policies for CRUD operations
    - Link profiles to auth.users for authentication
  
  3. Features
    - Voting system for projects and comments
    - VCI scoring system
    - Comment threading
    - User karma and statistics
    - AI tools tracking
*/

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop all existing tables to start completely fresh
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS ai_tools CASCADE;

-- Create profiles table (linked to auth.users)
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now() NOT NULL,
  username text UNIQUE NOT NULL,
  karma integer DEFAULT 0,
  projects_submitted integer DEFAULT 0,
  joined_at timestamptz DEFAULT now(),
  specialization text,
  ai_tools_used jsonb DEFAULT '[]'::jsonb,
  avatar_url text
);

-- Create projects table with all required fields
CREATE TABLE projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  github_url text,
  live_url text,
  screenshots jsonb DEFAULT '[]'::jsonb,
  technologies jsonb DEFAULT '[]'::jsonb,
  ai_tools jsonb DEFAULT '[]'::jsonb,
  vci_score integer NOT NULL DEFAULT 50,
  community_vci_score integer,
  submitted_at timestamptz DEFAULT now(),
  upvotes integer DEFAULT 0,
  downvotes integer DEFAULT 0,
  comment_count integer DEFAULT 0,
  is_verified boolean DEFAULT false,
  development_process jsonb DEFAULT '{}'::jsonb,
  prompts jsonb DEFAULT '[]'::jsonb,
  code_breakdown jsonb DEFAULT '{"aiGenerated": 0, "aiModified": 0, "humanWritten": 100}'::jsonb,
  repo_name text,
  tags jsonb DEFAULT '[]'::jsonb,
  submitted_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create comments table with threading support
CREATE TABLE comments (
  created_at timestamptz DEFAULT now() NOT NULL,
  author_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid REFERENCES comments(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  content text NOT NULL,
  upvotes integer DEFAULT 0,
  downvotes integer DEFAULT 0,
  karma integer DEFAULT 0,
  vci_vote integer
);

-- Create ai_tools master table
CREATE TABLE ai_tools (
  id bigserial PRIMARY KEY,
  created_at timestamptz DEFAULT now() NOT NULL,
  name text UNIQUE NOT NULL,
  category text
);

-- Add CHECK constraints
ALTER TABLE projects ADD CONSTRAINT projects_vci_score_check 
  CHECK (vci_score >= 0 AND vci_score <= 100);

ALTER TABLE projects ADD CONSTRAINT projects_community_vci_score_check 
  CHECK (community_vci_score IS NULL OR (community_vci_score >= 0 AND community_vci_score <= 100));

ALTER TABLE comments ADD CONSTRAINT comments_vci_vote_check 
  CHECK (vci_vote IS NULL OR (vci_vote >= 0 AND vci_vote <= 100));

-- Create indexes for performance
CREATE INDEX idx_profiles_username ON profiles(username);
CREATE INDEX idx_projects_submitted_by ON projects(submitted_by);
CREATE INDEX idx_projects_created_at ON projects(created_at DESC);
CREATE INDEX idx_projects_vci_score ON projects(vci_score DESC);
CREATE INDEX idx_projects_upvotes ON projects(upvotes DESC);
CREATE INDEX idx_comments_project_id ON comments(project_id);
CREATE INDEX idx_comments_author_id ON comments(author_id);
CREATE INDEX idx_comments_parent_id ON comments(parent_id);
CREATE INDEX idx_comments_created_at ON comments(created_at DESC);
CREATE INDEX idx_ai_tools_category ON ai_tools(category);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_tools ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Projects policies
CREATE POLICY "Anyone can view projects"
  ON projects
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create projects"
  ON projects
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = submitted_by);

CREATE POLICY "Users can update own projects"
  ON projects
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = submitted_by);

CREATE POLICY "Users can delete own projects"
  ON projects
  FOR DELETE
  TO authenticated
  USING (auth.uid() = submitted_by);

-- Comments policies
CREATE POLICY "Anyone can view comments"
  ON comments
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create comments"
  ON comments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update own comments"
  ON comments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id);

CREATE POLICY "Users can delete own comments"
  ON comments
  FOR DELETE
  TO authenticated
  USING (auth.uid() = author_id);

-- AI Tools policies (read-only)
CREATE POLICY "Anyone can view ai_tools"
  ON ai_tools
  FOR SELECT
  TO authenticated
  USING (true);

-- Insert common AI tools
INSERT INTO ai_tools (name, category) VALUES
  ('GitHub Copilot', 'coding'),
  ('ChatGPT', 'coding'),
  ('Claude', 'coding'),
  ('Cursor', 'coding'),
  ('v0.dev', 'design'),
  ('Bolt.new', 'coding'),
  ('Midjourney', 'design'),
  ('DALL-E', 'design'),
  ('Stable Diffusion', 'design'),
  ('Vercel AI SDK', 'coding'),
  ('OpenAI API', 'coding'),
  ('Anthropic API', 'coding'),
  ('Google Bard', 'coding'),
  ('Tabnine', 'coding'),
  ('CodeWhisperer', 'coding')
ON CONFLICT (name) DO NOTHING;

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'avatar_url', '')
  );
  RETURN new;
END;
$$ language plpgsql security definer;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update comment count
CREATE OR REPLACE FUNCTION update_project_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE projects 
    SET comment_count = comment_count + 1 
    WHERE id = NEW.project_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE projects 
    SET comment_count = GREATEST(comment_count - 1, 0) 
    WHERE id = OLD.project_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ language 'plpgsql';

-- Create triggers for comment count
CREATE TRIGGER update_comment_count_on_insert
  AFTER INSERT ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_project_comment_count();

CREATE TRIGGER update_comment_count_on_delete
  AFTER DELETE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_project_comment_count();

-- Create function to update user project count
CREATE OR REPLACE FUNCTION update_user_project_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE profiles 
    SET projects_submitted = projects_submitted + 1 
    WHERE id = NEW.submitted_by;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE profiles 
    SET projects_submitted = GREATEST(projects_submitted - 1, 0) 
    WHERE id = OLD.submitted_by;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ language 'plpgsql';

-- Create triggers for project count
CREATE TRIGGER update_project_count_on_insert
  AFTER INSERT ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_user_project_count();

CREATE TRIGGER update_project_count_on_delete
  AFTER DELETE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_user_project_count();