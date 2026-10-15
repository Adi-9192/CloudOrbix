IF COL_LENGTH(N'dbo.rfp_projects', N'end_month_half_month') IS NULL
BEGIN
    ALTER TABLE dbo.rfp_projects
    ADD end_month_half_month BIT NOT NULL CONSTRAINT DF_rfp_projects_end_month_half_month DEFAULT 0;
END;

IF COL_LENGTH(N'dbo.rfp_resources', N'allowance_percent') IS NULL
BEGIN
    ALTER TABLE dbo.rfp_resources
    ADD allowance_percent DECIMAL(7,3) NOT NULL CONSTRAINT DF_rfp_resources_allowance_percent DEFAULT 0 CHECK (allowance_percent BETWEEN 0 AND 100);
END;

IF OBJECT_ID(N'dbo.rfp_approval_requests', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.rfp_approval_requests (
        id INT IDENTITY(1,1) PRIMARY KEY,
        request_type NVARCHAR(10) NOT NULL CHECK (request_type IN (N'create', N'update', N'delete')),
        project_id INT NULL,
        payload NVARCHAR(MAX) NOT NULL,
        requester_id INT NOT NULL,
        status NVARCHAR(10) NOT NULL DEFAULT N'pending' CHECK (status IN (N'pending', N'approved', N'rejected')),
        created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        decided_at DATETIME2 NULL,
        decided_by INT NULL,
        CONSTRAINT FK_rfp_approval_requests_project FOREIGN KEY (project_id) REFERENCES dbo.rfp_projects(id) ON DELETE SET NULL,
        CONSTRAINT FK_rfp_approval_requests_requester FOREIGN KEY (requester_id) REFERENCES dbo.users(id),
        CONSTRAINT FK_rfp_approval_requests_decider FOREIGN KEY (decided_by) REFERENCES dbo.users(id),
        CONSTRAINT CK_rfp_approval_requests_payload CHECK (ISJSON(payload) = 1)
    );

    CREATE INDEX IX_rfp_approval_requests_status_created_at
        ON dbo.rfp_approval_requests(status, created_at DESC);
END;