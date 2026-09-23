IF OBJECT_ID('dbo.user_profile_tasks', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.user_profile_tasks (
        id INT IDENTITY(1,1) PRIMARY KEY,
        user_id INT NOT NULL,
        task_text NVARCHAR(MAX) NOT NULL,
        due_date DATE,
        is_done BIT NOT NULL DEFAULT 0,
        created_at DATETIME2 DEFAULT SYSUTCDATETIME(),
        updated_at DATETIME2 DEFAULT SYSUTCDATETIME(),

        CONSTRAINT FK_user_profile_tasks_users
            FOREIGN KEY (user_id)
            REFERENCES dbo.users(id)
            ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'idx_user_profile_tasks_user_id'
      AND object_id = OBJECT_ID('dbo.user_profile_tasks')
)
BEGIN
    CREATE INDEX idx_user_profile_tasks_user_id
    ON dbo.user_profile_tasks (
        user_id,
        is_done,
        due_date,
        created_at DESC
    );
END;
