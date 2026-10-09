IF OBJECT_ID(N'dbo.project_access_requests', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.project_access_requests (
        id BIGINT IDENTITY(1,1) PRIMARY KEY,
        client_id NVARCHAR(255) NOT NULL,
        requester_email NVARCHAR(255) NOT NULL,
        requester_name NVARCHAR(255) NOT NULL,
        status NVARCHAR(20) NOT NULL
            CONSTRAINT DF_project_access_requests_status DEFAULT N'pending',
        created_at DATETIME2 NOT NULL
            CONSTRAINT DF_project_access_requests_created_at DEFAULT SYSUTCDATETIME(),
        decided_at DATETIME2 NULL,
        decided_by NVARCHAR(255) NULL
    );

    CREATE INDEX IX_project_access_requests_status_created_at
        ON dbo.project_access_requests (status, created_at DESC);

    IF OBJECT_ID(N'dbo.notifications', N'U') IS NOT NULL
    BEGIN
        INSERT INTO dbo.project_access_requests (
            client_id,
            requester_email,
            requester_name
        )
        SELECT DISTINCT
            JSON_VALUE(n.metadata, '$.clientId'),
            LOWER(JSON_VALUE(n.metadata, '$.requesterEmail')),
            COALESCE(JSON_VALUE(n.metadata, '$.requesterName'), N'Project Manager')
        FROM dbo.notifications n
        INNER JOIN dbo.clients c
            ON c.client_id = JSON_VALUE(n.metadata, '$.clientId')
        WHERE n.type = 'approval'
          AND ISJSON(n.metadata) = 1
          AND JSON_VALUE(n.metadata, '$.action') = 'access_request'
          AND NULLIF(JSON_VALUE(n.metadata, '$.requesterEmail'), '') IS NOT NULL
          AND NOT EXISTS (
              SELECT 1
              FROM dbo.project_access_requests ar
              WHERE ar.client_id = JSON_VALUE(n.metadata, '$.clientId')
                AND LOWER(ar.requester_email) = LOWER(JSON_VALUE(n.metadata, '$.requesterEmail'))
          );
    END;
END;
