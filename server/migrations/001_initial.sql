CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS user_roles (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, UNIQUE(user_id, role_id));
CREATE TABLE IF NOT EXISTS clients (id SERIAL PRIMARY KEY, client_id VARCHAR(100) UNIQUE NOT NULL, client_name VARCHAR(255) NOT NULL, account_manager VARCHAR(255), region VARCHAR(100), industry VARCHAR(100), revenue NUMERIC(18,2) DEFAULT 0, current_status VARCHAR(80) NOT NULL, remarks TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, planned_onboard_date DATE, actual_onboard_date DATE, planned_offboard_date DATE, actual_offboard_date DATE, contract_start_date DATE, contract_end_date DATE, year INTEGER, completion NUMERIC(5,2) DEFAULT 0, hyperscaler VARCHAR(100), project_type VARCHAR(150), project_brief TEXT, project_manager VARCHAR(255), isow VARCHAR(100), estimated_start_date DATE, estimated_end_date DATE, actual_start_date DATE, actual_end_date DATE, approval_status VARCHAR(20) NOT NULL DEFAULT 'approved', pending_payload JSONB, pending_create BOOLEAN NOT NULL DEFAULT FALSE);
CREATE TABLE IF NOT EXISTS services (id SERIAL PRIMARY KEY, name VARCHAR(100) UNIQUE NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS client_services (id SERIAL PRIMARY KEY, client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE, service_id INTEGER REFERENCES services(id) ON DELETE CASCADE, UNIQUE(client_id, service_id));
CREATE TABLE IF NOT EXISTS status_history (id SERIAL PRIMARY KEY, client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE, previous_status VARCHAR(80), new_status VARCHAR(80), changed_by VARCHAR(255), changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS audit_logs (id SERIAL PRIMARY KEY, user_email VARCHAR(255), action VARCHAR(255), old_value TEXT, new_value TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS excel_import_logs (id SERIAL PRIMARY KEY, file_name VARCHAR(255), total_processed INTEGER DEFAULT 0, imported INTEGER DEFAULT 0, updated INTEGER DEFAULT 0, duplicates INTEGER DEFAULT 0, failed INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS project_tasks (id SERIAL PRIMARY KEY, client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE, task_title VARCHAR(255) NOT NULL, assigned_to VARCHAR(255), expected_start_date DATE, expected_end_date DATE, actual_start_date DATE, actual_end_date DATE, progress NUMERIC(5,2) DEFAULT 0, status VARCHAR(80) DEFAULT 'Not Started', remark TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS project_updates (id SERIAL PRIMARY KEY, client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE, update_text TEXT NOT NULL, updated_by VARCHAR(255), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS project_risks (id SERIAL PRIMARY KEY, client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE, customer_name VARCHAR(255), initiative_name VARCHAR(255), risk_title VARCHAR(255) NOT NULL, risk_category VARCHAR(150), date_raised DATE DEFAULT CURRENT_DATE, raised_by VARCHAR(255), description TEXT, probability VARCHAR(20) DEFAULT 'Medium', owner VARCHAR(255), level VARCHAR(20) DEFAULT 'Medium', impact VARCHAR(20) DEFAULT 'Medium', impact_description TEXT, status VARCHAR(20) DEFAULT 'Open', mitigation TEXT, comments_actions TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS project_documents (id SERIAL PRIMARY KEY, client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE, file_name VARCHAR(255) NOT NULL, blob_name VARCHAR(500) NOT NULL, blob_url TEXT, content_type VARCHAR(150), uploaded_by VARCHAR(255), document_type VARCHAR(100), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
INSERT INTO roles(name, description) VALUES ('Admin','Full access'),('Operations Team','Operations access'),('Manager','Reporting access'),('Viewer','Read-only access') ON CONFLICT(name) DO NOTHING;
