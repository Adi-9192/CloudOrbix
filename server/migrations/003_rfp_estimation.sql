IF OBJECT_ID('dbo.resource_rate_card_versions', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.resource_rate_card_versions (
        id INT IDENTITY(1,1) PRIMARY KEY,
        [year] INT NOT NULL UNIQUE,
        created_by INT NOT NULL,
        updated_by INT NOT NULL,
        created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_resource_rate_versions_created_by FOREIGN KEY (created_by) REFERENCES dbo.users(id),
        CONSTRAINT FK_resource_rate_versions_updated_by FOREIGN KEY (updated_by) REFERENCES dbo.users(id)
    );
END;

IF OBJECT_ID('dbo.resource_rate_cards', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.resource_rate_cards (
        id INT IDENTITY(1,1) PRIMARY KEY,
        version_id INT NOT NULL,
        grade NVARCHAR(30) NOT NULL,
        resource_type NVARCHAR(30) NOT NULL,
        daily_rate DECIMAL(18,2) NOT NULL CHECK (daily_rate >= 0),
        CONSTRAINT FK_resource_rate_cards_version FOREIGN KEY (version_id) REFERENCES dbo.resource_rate_card_versions(id) ON DELETE CASCADE,
        CONSTRAINT UQ_resource_rate_cards_grade_type UNIQUE (version_id, grade, resource_type)
    );
END;

IF OBJECT_ID('dbo.currency_exchange_rate_versions', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.currency_exchange_rate_versions (
        id INT IDENTITY(1,1) PRIMARY KEY,
        [year] INT NOT NULL UNIQUE,
        created_by INT NOT NULL,
        updated_by INT NOT NULL,
        created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_currency_rate_versions_created_by FOREIGN KEY (created_by) REFERENCES dbo.users(id),
        CONSTRAINT FK_currency_rate_versions_updated_by FOREIGN KEY (updated_by) REFERENCES dbo.users(id)
    );
END;

IF OBJECT_ID('dbo.currency_exchange_rates', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.currency_exchange_rates (
        id INT IDENTITY(1,1) PRIMARY KEY,
        version_id INT NOT NULL,
        currency_pair NVARCHAR(15) NOT NULL,
        rate_to_inr DECIMAL(18,6) NOT NULL CHECK (rate_to_inr > 0),
        CONSTRAINT FK_currency_exchange_rates_version FOREIGN KEY (version_id) REFERENCES dbo.currency_exchange_rate_versions(id) ON DELETE CASCADE,
        CONSTRAINT UQ_currency_exchange_rates_pair UNIQUE (version_id, currency_pair)
    );
END;

IF OBJECT_ID('dbo.rfp_projects', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.rfp_projects (
        id INT IDENTITY(1,1) PRIMARY KEY,
        project_name NVARCHAR(255) NOT NULL,
        client_name NVARCHAR(255) NOT NULL,
        [year] INT NOT NULL,
        currency_code CHAR(3) NOT NULL DEFAULT 'INR',
        start_month DATE NOT NULL,
        end_month DATE NOT NULL,
        allowance_percent DECIMAL(7,3) NOT NULL DEFAULT 0 CHECK (allowance_percent BETWEEN 0 AND 100),
        working_days_per_month DECIMAL(5,2) NOT NULL DEFAULT 22 CHECK (working_days_per_month > 0 AND working_days_per_month <= 31),
        notes NVARCHAR(MAX),
        status NVARCHAR(20) NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Submitted')),
        created_by INT NOT NULL,
        updated_by INT NOT NULL,
        created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_rfp_projects_created_by FOREIGN KEY (created_by) REFERENCES dbo.users(id),
        CONSTRAINT FK_rfp_projects_updated_by FOREIGN KEY (updated_by) REFERENCES dbo.users(id),
        CONSTRAINT CK_rfp_projects_month_range CHECK (start_month <= end_month)
    );
END;

IF OBJECT_ID('dbo.rfp_resources', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.rfp_resources (
        id INT IDENTITY(1,1) PRIMARY KEY,
        project_id INT NOT NULL,
        resource_name NVARCHAR(255) NOT NULL,
        grade NVARCHAR(30) NOT NULL,
        resource_type NVARCHAR(30) NOT NULL,
        sort_order INT NOT NULL DEFAULT 0,
        CONSTRAINT FK_rfp_resources_project FOREIGN KEY (project_id) REFERENCES dbo.rfp_projects(id) ON DELETE CASCADE
    );
END;

IF OBJECT_ID('dbo.rfp_resource_monthly_allocations', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.rfp_resource_monthly_allocations (
        id INT IDENTITY(1,1) PRIMARY KEY,
        resource_id INT NOT NULL,
        allocation_month DATE NOT NULL,
        fte DECIMAL(5,2) NOT NULL,
        CONSTRAINT CK_rfp_allocations_fte CHECK (fte >= 0 AND fte <= 999.99),
        CONSTRAINT FK_rfp_allocations_resource FOREIGN KEY (resource_id) REFERENCES dbo.rfp_resources(id) ON DELETE CASCADE,
        CONSTRAINT UQ_rfp_allocations_resource_month UNIQUE (resource_id, allocation_month)
    );
END;

IF OBJECT_ID('dbo.rfp_cost_summary', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.rfp_cost_summary (
        project_id INT PRIMARY KEY,
        base_cost_inr DECIMAL(18,2) NOT NULL DEFAULT 0,
        allowance_cost_inr DECIMAL(18,2) NOT NULL DEFAULT 0,
        grand_total_inr DECIMAL(18,2) NOT NULL DEFAULT 0,
        selected_currency_total DECIMAL(18,2) NOT NULL DEFAULT 0,
        exchange_rate DECIMAL(18,6) NOT NULL DEFAULT 1,
        updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_rfp_cost_summary_project FOREIGN KEY (project_id) REFERENCES dbo.rfp_projects(id) ON DELETE CASCADE
    );
END;