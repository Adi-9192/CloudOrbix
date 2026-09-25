IF OBJECT_ID('dbo.roles', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.roles (
        id INT IDENTITY(1,1) PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL,
        description NVARCHAR(MAX),
        created_at DATETIME2 DEFAULT SYSUTCDATETIME()
    );
END;

IF OBJECT_ID('dbo.users', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.users (
        id INT IDENTITY(1,1) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        is_active BIT NOT NULL DEFAULT 1,
        created_at DATETIME2 DEFAULT SYSUTCDATETIME(),
        updated_at DATETIME2 DEFAULT SYSUTCDATETIME()
    );
END;

IF OBJECT_ID('dbo.user_roles', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.user_roles (
        id INT IDENTITY(1,1) PRIMARY KEY,
        user_id INT,
        role_id INT,
        created_at DATETIME2 DEFAULT SYSUTCDATETIME(),

        CONSTRAINT FK_user_roles_users
            FOREIGN KEY (user_id)
            REFERENCES dbo.users(id)
            ON DELETE CASCADE,

        CONSTRAINT FK_user_roles_roles
            FOREIGN KEY (role_id)
            REFERENCES dbo.roles(id)
            ON DELETE CASCADE,

        CONSTRAINT UQ_user_roles UNIQUE(user_id, role_id)
    );
END;

IF OBJECT_ID('dbo.clients', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.clients (
        id INT IDENTITY(1,1) PRIMARY KEY,
        client_id VARCHAR(100) UNIQUE NOT NULL,
        client_name VARCHAR(255) NOT NULL,
        account_manager VARCHAR(255),
        region VARCHAR(100),
        industry VARCHAR(100),
        revenue DECIMAL(18,2) DEFAULT 0,
        current_status VARCHAR(80) NOT NULL,
        remarks NVARCHAR(MAX),
        created_at DATETIME2 DEFAULT SYSUTCDATETIME(),
        updated_at DATETIME2 DEFAULT SYSUTCDATETIME(),
        planned_onboard_date DATE,
        actual_onboard_date DATE,
        planned_offboard_date DATE,
        actual_offboard_date DATE,
        contract_start_date DATE,
        contract_end_date DATE,
        [year] INT,
        completion DECIMAL(5,2) DEFAULT 0,
        hyperscaler VARCHAR(100),
        project_type VARCHAR(150),
        project_brief NVARCHAR(MAX),
        project_manager VARCHAR(255),
        isow VARCHAR(100),
        estimated_start_date DATE,
        estimated_end_date DATE,
        actual_start_date DATE,
        actual_end_date DATE,
        approval_status VARCHAR(20) NOT NULL DEFAULT 'approved',
        pending_payload NVARCHAR(MAX),
        pending_create BIT NOT NULL DEFAULT 0
    );
END;

IF OBJECT_ID('dbo.services', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.services (
        id INT IDENTITY(1,1) PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        created_at DATETIME2 DEFAULT SYSUTCDATETIME()
    );
END;

IF OBJECT_ID('dbo.client_services', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.client_services (
        id INT IDENTITY(1,1) PRIMARY KEY,
        client_id INT,
        service_id INT,

        CONSTRAINT FK_client_services_clients
            FOREIGN KEY (client_id)
            REFERENCES dbo.clients(id)
            ON DELETE CASCADE,

        CONSTRAINT FK_client_services_services
            FOREIGN KEY (service_id)
            REFERENCES dbo.services(id)
            ON DELETE CASCADE,

        CONSTRAINT UQ_client_services UNIQUE(client_id, service_id)
    );
END;

IF OBJECT_ID('dbo.status_history', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.status_history (
        id INT IDENTITY(1,1) PRIMARY KEY,
        client_id INT,
        previous_status VARCHAR(80),
        new_status VARCHAR(80),
        changed_by VARCHAR(255),
        changed_at DATETIME2 DEFAULT SYSUTCDATETIME(),

        CONSTRAINT FK_status_history_clients
            FOREIGN KEY (client_id)
            REFERENCES dbo.clients(id)
            ON DELETE CASCADE
    );
END;

IF OBJECT_ID('dbo.audit_logs', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.audit_logs (
        id INT IDENTITY(1,1) PRIMARY KEY,
        user_email VARCHAR(255),
        action VARCHAR(255),
        old_value NVARCHAR(MAX),
        new_value NVARCHAR(MAX),
        created_at DATETIME2 DEFAULT SYSUTCDATETIME()
    );
END;

IF OBJECT_ID('dbo.excel_import_logs', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.excel_import_logs (
        id INT IDENTITY(1,1) PRIMARY KEY,
        file_name VARCHAR(255),
        total_processed INT DEFAULT 0,
        imported INT DEFAULT 0,
        updated INT DEFAULT 0,
        duplicates INT DEFAULT 0,
        failed INT DEFAULT 0,
        created_at DATETIME2 DEFAULT SYSUTCDATETIME()
    );
END;

IF OBJECT_ID('dbo.project_tasks', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.project_tasks (
        id INT IDENTITY(1,1) PRIMARY KEY,
        client_id INT,
        task_title VARCHAR(255) NOT NULL,
        assigned_to VARCHAR(255),
        expected_start_date DATE,
        expected_end_date DATE,
        actual_start_date DATE,
        actual_end_date DATE,
        progress DECIMAL(5,2) DEFAULT 0,
        status VARCHAR(80) DEFAULT 'Not Started',
        remark NVARCHAR(MAX),
        created_at DATETIME2 DEFAULT SYSUTCDATETIME(),
        updated_at DATETIME2 DEFAULT SYSUTCDATETIME(),

        CONSTRAINT FK_project_tasks_clients
            FOREIGN KEY (client_id)
            REFERENCES dbo.clients(id)
            ON DELETE CASCADE
    );
END;

IF OBJECT_ID('dbo.project_updates', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.project_updates (
        id INT IDENTITY(1,1) PRIMARY KEY,
        client_id INT,
        update_text NVARCHAR(MAX) NOT NULL,
        updated_by VARCHAR(255),
        created_at DATETIME2 DEFAULT SYSUTCDATETIME(),

        CONSTRAINT FK_project_updates_clients
            FOREIGN KEY (client_id)
            REFERENCES dbo.clients(id)
            ON DELETE CASCADE
    );
END;

IF OBJECT_ID('dbo.project_risks', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.project_risks (
        id INT IDENTITY(1,1) PRIMARY KEY,
        client_id INT,
        customer_name VARCHAR(255),
        initiative_name VARCHAR(255),
        risk_title VARCHAR(255) NOT NULL,
        risk_category VARCHAR(150),
        date_raised DATE DEFAULT CAST(GETDATE() AS DATE),
        raised_by VARCHAR(255),
        description NVARCHAR(MAX),
        probability VARCHAR(20) DEFAULT 'Medium',
        owner VARCHAR(255),
        level VARCHAR(20) DEFAULT 'Medium',
        impact VARCHAR(20) DEFAULT 'Medium',
        impact_description NVARCHAR(MAX),
        status VARCHAR(20) DEFAULT 'Open',
        mitigation NVARCHAR(MAX),
        comments_actions NVARCHAR(MAX),
        created_at DATETIME2 DEFAULT SYSUTCDATETIME(),
        updated_at DATETIME2 DEFAULT SYSUTCDATETIME(),

        CONSTRAINT FK_project_risks_clients
            FOREIGN KEY (client_id)
            REFERENCES dbo.clients(id)
            ON DELETE CASCADE
    );
END;

IF OBJECT_ID('dbo.project_documents', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.project_documents (
        id INT IDENTITY(1,1) PRIMARY KEY,
        client_id INT,
        file_name VARCHAR(255) NOT NULL,
        blob_name VARCHAR(500) NOT NULL,
        blob_url NVARCHAR(MAX),
        content_type VARCHAR(150),
        uploaded_by VARCHAR(255),
        document_type VARCHAR(100),
        created_at DATETIME2 DEFAULT SYSUTCDATETIME(),

        CONSTRAINT FK_project_documents_clients
            FOREIGN KEY (client_id)
            REFERENCES dbo.clients(id)
            ON DELETE CASCADE
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.roles WHERE name = 'Admin')
BEGIN
    INSERT INTO dbo.roles(name, description)
    VALUES ('Admin', 'Full access');
END;

IF NOT EXISTS (SELECT 1 FROM dbo.roles WHERE name = 'Operations Team')
BEGIN
    INSERT INTO dbo.roles(name, description)
    VALUES ('Operations Team', 'Operations access');
END;

IF NOT EXISTS (SELECT 1 FROM dbo.roles WHERE name = 'Manager')
BEGIN
    INSERT INTO dbo.roles(name, description)
    VALUES ('Manager', 'Reporting access');
END;

IF NOT EXISTS (SELECT 1 FROM dbo.roles WHERE name = 'Viewer')
BEGIN
    INSERT INTO dbo.roles(name, description)
    VALUES ('Viewer', 'Read-only access');
END;
