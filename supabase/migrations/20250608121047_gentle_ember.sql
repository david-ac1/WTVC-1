/*
  # Add created_at column to projects table

  1. Changes
    - Add `created_at` column to `projects` table with timestamp type
    - Set default value to current timestamp
    - Make column non-nullable with default for existing rows

  2. Notes
    - This fixes the missing created_at column error
    - Existing projects will get the current timestamp as their created_at value
    - New projects will automatically get the timestamp when inserted
*/

-- Add created_at column to projects table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE projects ADD COLUMN created_at timestamptz DEFAULT now() NOT NULL;
  END IF;
END $$;