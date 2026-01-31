-- Drop existing tables
DROP TABLE IF EXISTS feedback;
DROP TABLE IF EXISTS projects;
DROP INDEX IF EXISTS idx_source;
DROP INDEX IF EXISTS idx_sentiment;
DROP INDEX IF EXISTS idx_created_at;
DROP INDEX IF EXISTS idx_project;

-- Projects table
CREATE TABLE projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Enhanced feedback table
CREATE TABLE feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER DEFAULT 1,
  source TEXT NOT NULL,
  content TEXT NOT NULL,
  sentiment TEXT,
  category TEXT,
  priority INTEGER DEFAULT 0,
  user_id TEXT,
  ai_summary TEXT,
  ai_recommendation TEXT,
  metadata TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- Insert default projects
INSERT INTO projects (name, description) VALUES 
  ('General', 'General product feedback'),
  ('Mobile App', 'iOS and Android application'),
  ('Web Dashboard', 'Web-based admin interface'),
  ('API', 'REST API and integrations'),
  ('Documentation', 'User guides and technical docs');

-- Indexes for performance
CREATE INDEX idx_source ON feedback(source);
CREATE INDEX idx_sentiment ON feedback(sentiment);
CREATE INDEX idx_created_at ON feedback(created_at);
CREATE INDEX idx_project ON feedback(project_id);
CREATE INDEX idx_priority ON feedback(priority);
