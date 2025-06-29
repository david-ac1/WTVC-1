/*
  # Add missing update_updated_at_column function

  1. Functions
    - Create the missing `update_updated_at_column()` function that was referenced by triggers
    - This function automatically updates the `updated_at` timestamp when rows are modified

  2. Notes
    - This resolves the "function update_updated_at_column() does not exist" error
    - The function is a standard PostgreSQL utility for maintaining updated_at timestamps
    - This is required for the existing triggers to work properly
*/

-- Create the missing update_updated_at_column function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';