IF OBJECT_ID('dbo.rfp_resource_monthly_allocations', 'U') IS NOT NULL
BEGIN
    DECLARE @constraintName NVARCHAR(128);
    DECLARE @dropConstraintSql NVARCHAR(400);

    WHILE 1 = 1
    BEGIN
        SET @constraintName = NULL;

        SELECT TOP (1) @constraintName = name
        FROM sys.check_constraints
        WHERE parent_object_id = OBJECT_ID('dbo.rfp_resource_monthly_allocations')
          AND definition LIKE '%fte%';

        IF @constraintName IS NULL BREAK;

        SET @dropConstraintSql = N'ALTER TABLE dbo.rfp_resource_monthly_allocations DROP CONSTRAINT ' + QUOTENAME(@constraintName);
        EXEC sys.sp_executesql @dropConstraintSql;
    END;

    ALTER TABLE dbo.rfp_resource_monthly_allocations
    ADD CONSTRAINT CK_rfp_allocations_fte CHECK (fte >= 0 AND fte <= 999.99);
END;