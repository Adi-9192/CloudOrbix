IF COL_LENGTH('dbo.rfp_resources', 'daily_man_days') IS NULL
BEGIN
    ALTER TABLE dbo.rfp_resources
    ADD daily_man_days DECIMAL(5,2) NOT NULL
        CONSTRAINT DF_rfp_resources_daily_man_days DEFAULT (0);
END;

EXEC sys.sp_executesql N'
    UPDATE r
    SET daily_man_days = CONVERT(DECIMAL(5,2), p.duration_days)
    FROM dbo.rfp_resources r
    JOIN dbo.rfp_projects p ON p.id = r.project_id
    WHERE p.duration_days > 0
      AND EXISTS (
          SELECT 1
          FROM dbo.rfp_resource_monthly_allocations a
          WHERE a.resource_id = r.id
            AND a.allocation_month = DATEADD(
                MONTH,
                p.duration_months,
                DATEFROMPARTS(YEAR(p.requested_date), MONTH(p.requested_date), 1)
            )
            AND a.fte > 0
      );
';
