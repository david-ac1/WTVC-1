/*
  # Create database triggers and functions

  1. Functions
    - Function to update updated_at timestamp
    - Function to update comment count on projects

  2. Triggers
    - Trigger to update updated_at on profiles
    - Trigger to update updated_at on projects
    - Trigger to update updated_at on comments
    - Trigger to update comment count when comments are added/removed
*/

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to update comment count
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
        SET comment_count = comment_count - 1 
        WHERE id = OLD.project_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_comments_updated_at ON comments;
CREATE TRIGGER update_comments_updated_at
    BEFORE UPDATE ON comments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create triggers for comment count
DROP TRIGGER IF EXISTS update_comment_count_on_insert ON comments;
CREATE TRIGGER update_comment_count_on_insert
    AFTER INSERT ON comments
    FOR EACH ROW
    EXECUTE FUNCTION update_project_comment_count();

DROP TRIGGER IF EXISTS update_comment_count_on_delete ON comments;
CREATE TRIGGER update_comment_count_on_delete
    AFTER DELETE ON comments
    FOR EACH ROW
    EXECUTE FUNCTION update_project_comment_count();