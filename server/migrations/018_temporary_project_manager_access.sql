IF OBJECT_ID(N'dbo.project_temporary_access', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.project_temporary_access (
        id BIGINT IDENTITY(1,1) PRIMARY KEY,
        client_id INT NOT NULL,
        manager_user_id INT NOT NULL,
        requester_user_id INT NOT NULL,
        reason NVARCHAR(1000) NOT NULL,
        status NVARCHAR(20) NOT NULL
            CONSTRAINT DF_project_temporary_access_status DEFAULT N'pending',
        created_at DATETIME2 NOT NULL
            CONSTRAINT DF_project_temporary_access_created_at DEFAULT SYSUTCDATETIME(),
        decided_at DATETIME2 NULL,
        decided_by INT NULL,
        revoked_at DATETIME2 NULL,
        revoked_by INT NULL,
        CONSTRAINT CK_project_temporary_access_status
            CHECK (status IN (N'pending', N'approved', N'rejected', N'revoked')),
        CONSTRAINT FK_project_temporary_access_client
            FOREIGN KEY (client_id) REFERENCES dbo.clients(id) ON DELETE CASCADE
    );

    CREATE INDEX IX_project_temporary_access_client_status
        ON dbo.project_temporary_access (client_id, status);
    CREATE INDEX IX_project_temporary_access_status_created
        ON dbo.project_temporary_access (status, created_at DESC);
    CREATE INDEX IX_project_temporary_access_manager
        ON dbo.project_temporary_access (manager_user_id, status);
END;
