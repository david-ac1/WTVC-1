/*
  # Create projects table

  1. New Tables
    - `projects`
      - `id` (uuid, primary key)
      - `title` (text, required)
      - `description` (text, optional)
      - `repo_name` (text, optional)
      - `github_url` (text, optional)
      - `live_url` (text, optional)
      - `screenshots` (text array, default empty)
      - `technologies` (text array, default empty)
      - `tags` (text array, default empty)
      - `ai_tools` (text array, default empty)
      - `vci_score` (integer, default 50)
      - `community_vci_score` (integer, optional)
      - `submitted_by` (uuid, references profiles)
      - `submitted_at` (timestamptz, default now)
      - `upvotes` (integer, default 0)
      - `downvotes` (integer, default 0)
      - `comment_count` (integer, default 0)
      - `is_verified` (boolean, default false)
      - `analysis` (jsonb, optional)
      - `development_process` (jsonb, optional)
      - `prompts` (text array, default empty)
      - `code_breakdown` (jsonb, optional)
      - `created_at` (timestamptz, default now)
      - `updated_at` (timestamptz, default now)

  2. Security
    - Enable RLS on `projects` table
    - Add policy for everyone to read projects
    - Add policy for authenticated users to create projects
    - Add policy for users to update their own projects
*/

CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  repo_name text,
  github_url text,
  live_url text,
  screenshots text[] DEFAULT '{}',
  technologies text[] DEFAULT '{}',
  tags text[] DEFAULT '{}',
  ai_tools text[] DEFAULT '{}',
  vci_score integer DEFAULT 50,
  community_vci_score integer,
  submitted_by uuid REFERENCES profiles(id) ON DELETE CASCADE,
  submitted_at timestamptz DEFAULT now(),
  upvotes integer DEFAULT 0,
  downvotes integer DEFAULT 0,
  comment_count integer DEFAULT 0,
  is_verified boolean DEFAULT false,
  analysis jsonb,
  development_process jsonb,
  prompts text[] DEFAULT '{}',
  code_breakdown jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Projects are viewable by everyone"
  ON projects
  FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Authenticated users can create projects"
  ON projects
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = submitted_by);

CREATE POLICY "Users can update own projects"
  ON projects
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = submitted_by);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_projects_submitted_by ON projects(submitted_by);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at);
CREATE INDEX IF NOT EXISTS idx_projects_upvotes ON projects(upvotes);
CREATE INDEX IF NOT EXISTS idx_projects_vci_score ON projects(vci_score);