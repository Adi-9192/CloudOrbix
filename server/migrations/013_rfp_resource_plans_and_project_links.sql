IF COL_LENGTH('dbo.rfp_resources', 'resource_plan_type') IS NULL
BEGIN
    ALTER TABLE dbo.rfp_resources
    ADD resource_plan_type NVARCHAR(10) NOT NULL
        CONSTRAINT DF_rfp_resources_resource_plan_type DEFAULT ('monthly');
END;

IF NOT EXISTS (
    SELECT 1 FROM sys.check_constraints
    WHERE parent_object_id = OBJECT_ID('dbo.rfp_resources')
      AND name = 'CK_rfp_resources_resource_plan_type'
)
BEGIN
    EXEC sys.sp_executesql N'
        ALTER TABLE dbo.rfp_resources
        ADD CONSTRAINT CK_rfp_resources_resource_plan_type
            CHECK (resource_plan_type IN (''monthly'', ''daily''));
    ';
END;

CREATE TABLE #resourceMap (
    monthly_resource_id INT,
    daily_resource_id INT
);

EXEC sys.sp_executesql N'
    MERGE dbo.rfp_resources AS target
    USING (
        SELECT r.id, r.project_id, r.resource_name, r.grade, r.resource_type,
               r.daily_man_days, r.sort_order
        FROM dbo.rfp_resources r
        WHERE r.resource_plan_type = ''monthly''
          AND r.daily_man_days > 0
    ) AS source
    ON 1 = 0
    WHEN NOT MATCHED THEN
        INSERT (project_id, resource_name, grade, resource_type,
                resource_plan_type, daily_man_days, sort_order)
        VALUES (source.project_id, source.resource_name, source.grade,
                source.resource_type, ''daily'', source.daily_man_days,
                source.sort_order)
    OUTPUT source.id, inserted.id
    INTO #resourceMap (monthly_resource_id, daily_resource_id);
';

EXEC sys.sp_executesql N'
    INSERT INTO dbo.rfp_resource_monthly_allocations (resource_id, allocation_month, fte)
    SELECT map.daily_resource_id, allocation.allocation_month, allocation.fte
    FROM #resourceMap map
    JOIN dbo.rfp_resource_monthly_allocations allocation
      ON allocation.resource_id = map.monthly_resource_id
    JOIN dbo.rfp_resources resource
      ON resource.id = map.monthly_resource_id
    JOIN dbo.rfp_projects project
      ON project.id = resource.project_id
    WHERE allocation.allocation_month = DATEADD(
        MONTH,
        project.duration_months,
        DATEFROMPARTS(YEAR(project.requested_date), MONTH(project.requested_date), 1)
    );

    UPDATE resource
    SET daily_man_days = 0
    FROM dbo.rfp_resources resource
    JOIN #resourceMap map
      ON map.monthly_resource_id = resource.id;
';

IF COL_LENGTH('dbo.clients', 'rfp_project_id') IS NULL
BEGIN
    ALTER TABLE dbo.clients
    ADD rfp_project_id INT NULL
        CONSTRAINT FK_clients_rfp_project
        REFERENCES dbo.rfp_projects(id) ON DELETE SET NULL;
END;

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id = OBJECT_ID('dbo.clients')
      AND name = 'UX_clients_rfp_project_id'
)
BEGIN
    EXEC sys.sp_executesql N'
        CREATE UNIQUE INDEX UX_clients_rfp_project_id
        ON dbo.clients(rfp_project_id)
        WHERE rfp_project_id IS NOT NULL;
    ';
END;
