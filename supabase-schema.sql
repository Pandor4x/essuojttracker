-- Supabase SQL Schema for OJT Tracking System

-- Create users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_number VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'student' CHECK (role IN ('student', 'admin')),
  picture BYTEA,
  approved BOOLEAN DEFAULT FALSE,
  registration_date DATE DEFAULT CURRENT_DATE,
  location VARCHAR(100),
  last_active TIMESTAMP,
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create logs table
CREATE TABLE logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  task TEXT NOT NULL,
  hours INTEGER NOT NULL,
  proof BYTEA,
  status VARCHAR(50) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_users_student_number ON users(student_number);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_approved ON users(approved);
CREATE INDEX idx_logs_user_id ON logs(user_id);
CREATE INDEX idx_logs_email ON logs(email);
CREATE INDEX idx_logs_status ON logs(status);
CREATE INDEX idx_logs_date ON logs(date);

-- Insert default admin user
INSERT INTO users (student_number, name, email, password, role, approved, location)
VALUES ('ad-minss', 'Admin', 'admin@ojt.com', 'admin', 'admin', TRUE, 'Admin Office')
ON CONFLICT (student_number) DO NOTHING;

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Allow users to view all users" ON users FOR SELECT USING (true);
CREATE POLICY "Allow users to insert their own user record" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow users to update their own record" ON users FOR UPDATE USING (true);

-- RLS Policies for logs table
CREATE POLICY "Allow users to view all logs" ON logs FOR SELECT USING (true);
CREATE POLICY "Allow users to insert logs" ON logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow users to update logs" ON logs FOR UPDATE USING (true);
