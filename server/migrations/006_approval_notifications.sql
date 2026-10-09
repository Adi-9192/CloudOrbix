IF OBJECT_ID(N'dbo.notifications', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.notifications (
        id BIGINT IDENTITY(1,1) PRIMARY KEY,
        user_email VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        title NVARCHAR(255) NOT NULL,
        message NVARCHAR(MAX) NOT NULL,
        metadata NVARCHAR(MAX) NOT NULL
            CONSTRAINT DF_notifications_metadata DEFAULT N'{}',
        is_read BIT NOT NULL
            CONSTRAINT DF_notifications_is_read DEFAULT 0,
        created_at DATETIME2 NOT NULL
            CONSTRAINT DF_notifications_created_at DEFAULT SYSUTCDATETIME()
    );

    CREATE INDEX IX_notifications_user_email_created_at
        ON dbo.notifications (user_email, created_at DESC, id DESC);
END;
