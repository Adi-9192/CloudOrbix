IF COL_LENGTH('dbo.clients', 'revenue_recovery_percentage') IS NULL
BEGIN
    ALTER TABLE dbo.clients
    ADD revenue_recovery_percentage DECIMAL(5,2) NOT NULL
        CONSTRAINT DF_clients_revenue_recovery_percentage DEFAULT (0);
END;

IF NOT EXISTS (
    SELECT 1
    FROM sys.check_constraints
    WHERE name = 'CK_clients_revenue_recovery_percentage'
      AND parent_object_id = OBJECT_ID('dbo.clients')
)
BEGIN
    EXEC sys.sp_executesql N'
        ALTER TABLE dbo.clients
        ADD CONSTRAINT CK_clients_revenue_recovery_percentage
            CHECK (revenue_recovery_percentage >= 0 AND revenue_recovery_percentage <= 100);
    ';
END;
